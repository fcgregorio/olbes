import { NextFunction, Request, Response, Router } from 'express';
import sequelize, { Item, OutTransaction, OutTransactionAttributes, OutTransactionHistory, OutTransactionHistoryAttributes, OutTransfer, Transaction, Transfer, Unit } from '../../sequelize';
import { loginRequiredMiddleware, adminRequiredMiddleware } from '../../middleware/auth';
import { Op, QueryTypes, ValidationError, WhereOptions } from 'sequelize';
import { DateTime } from 'luxon';

const router = Router();
router.use(loginRequiredMiddleware);

router.post('/', async function (req: Request, res: Response, next: NextFunction) {
    try {
        const result = await sequelize.transaction(async (t) => {
            const outTransaction = await OutTransaction.create(
                {
                    customer: req.body.customer,
                    deliveryReceipt: req.body.deliveryReceipt,
                    dateOfDeliveryReceipt: req.body.dateOfDeliveryReceipt,
                },
                {
                    include: [OutTransfer],
                    transaction: t,
                    user: res.locals.user,
                },
            );

            await Transaction.create(
                {
                    inTransaction: null,
                    outTransaction: outTransaction.id,
                    createdAt: outTransaction.createdAt,
                    updatedAt: outTransaction.updatedAt,
                },
                {
                    transaction: t,
                    silent: true,
                },
            );

            if (req.body.outTransfers.length == 0) {
                throw new ValidationError('Out-Transfers cannot be empty.');
            }

            req.body.outTransfers.reverse();
            for (const element of req.body.outTransfers) {
                const outTransfer = await OutTransfer.create(
                    {
                        transaction: outTransaction.id,
                        item: element.item,
                        quantity: element.quantity,
                        createdAt: outTransaction.createdAt,
                        updatedAt: outTransaction.updatedAt,
                    },
                    {
                        transaction: t,
                        silent: true,
                    },
                );

                await Transfer.create(
                    {
                        inTransfer: null,
                        outTransfer: outTransfer.id,
                        createdAt: outTransfer.createdAt,
                        updatedAt: outTransfer.updatedAt,
                    },
                    {
                        transaction: t,
                        silent: true,
                    },
                );

                let item = await Item.findByPk(
                    element.item,
                    {
                        rejectOnEmpty: true,
                        transaction: t,
                        lock: t.LOCK.UPDATE,
                    },
                );

                await sequelize.query(
                    'UPDATE items SET updatedAt = :updatedAt WHERE id = :id',
                    {
                        replacements: {
                            id: item.id,
                            updatedAt: outTransfer.updatedAt,
                        },
                        type: QueryTypes.UPDATE,
                        transaction: t,
                    },
                );

                item = await item.reload({
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });

                item.stock = item.stock - element.quantity;
                await item.save(
                    {
                        transaction: t,
                        silent: true,
                        user: res.locals.user,
                    },
                );
            }

            return outTransaction;
        });

        res.status(201).json(result.id);
    } catch (error: any) {
        next(error);
    }
});

router.get('/', async function (req: Request, res: Response, next: NextFunction) {
    try {
        let where: WhereOptions<OutTransactionAttributes> = {};

        const dateQuery = req.query.date as string;
        if (dateQuery !== undefined) {
            const date = DateTime.fromISO(req.query.date as string);
            if (!date.isValid) {
                res.status(400).send('Invalid date');
                return;
            } else {
                where = {
                    ...where,
                    createdAt: {
                        [Op.gte]: date.startOf('day').toJSDate(),
                        [Op.lte]: date.endOf('day').toJSDate(),
                    },
                };
            }
        }

        const searchQuery = req.query.search as string;
        if (searchQuery !== undefined && searchQuery !== '') {
            where = {
                ...where,
                customer: {
                    [Op.like]: '%' + searchQuery + '%', // TODO
                },
            };

        }

        const count = await OutTransaction.count({
            where: where,
        });

        const cursorQuery = req.query.cursor as string;
        if (cursorQuery !== undefined) {
            const cursor = await OutTransaction.findByPk(
                cursorQuery,
                {
                    attributes: ['id', 'createdAt'],
                    rejectOnEmpty: true,
                },
            );

            where = {
                ...where,
                [Op.or]: [
                    {
                        createdAt: {
                            [Op.lt]: cursor.createdAt,
                        },
                    },
                    {
                        [Op.and]: [
                            {
                                createdAt: cursor.createdAt,
                            },
                            {
                                id: {
                                    [Op.lt]: cursor.id,
                                },
                            },
                        ]
                    },
                ]
            };
        }

        const results = await OutTransaction.findAll({
            include: [
                {
                    model: OutTransfer,
                    attributes: ['quantity', 'item'],
                    include: [
                        {
                            model: Item,
                            attributes: ['name'],
                            paranoid: false,
                            include: [
                                {
                                    model: Unit,
                                    attributes: ['name'],
                                    paranoid: false,
                                },
                            ],
                        },
                    ],
                    order: [
                        ['createdAt', 'DESC'],
                        ['id', 'DESC'],
                    ],
                },
            ],
            where: where,
            order: [
                ['createdAt', 'DESC'],
                ['id', 'DESC'],
            ],
            limit: 100,
        });

        res.status(200).json({
            count: count,
            results: results,
        });
    } catch (error: any) {
        next(error);
    }
});

router.get('/:id', async function (req: Request, res: Response, next: NextFunction) {
    try {
        const result = await OutTransaction.findByPk(
            req.params.id,
            {
                include: [
                    {
                        model: OutTransfer,
                        attributes: ['quantity', 'item'],
                        include: [
                            {
                                model: Item,
                                attributes: ['name'],
                                paranoid: false,
                                include: [
                                    {
                                        model: Unit,
                                        attributes: ['name'],
                                        paranoid: false,
                                    },
                                ],
                            },
                        ],
                        order: [
                            ['createdAt', 'DESC'],
                            ['id', 'DESC'],
                        ],
                    },
                ],
                rejectOnEmpty: true,
            },
        );

        res.status(200).json(result);
    } catch (error: any) {
        next(error);
    }
});

router.get('/:id/histories', adminRequiredMiddleware, async function (req: Request, res: Response, next: NextFunction) {
    try {
        let where: WhereOptions<OutTransactionHistoryAttributes> = {
            id: req.params.id,
        };

        const count = await OutTransactionHistory.count({
            where: where,
        });

        const cursorQuery = req.query.cursor as string;
        if (cursorQuery !== undefined) {
            const cursor = await OutTransactionHistory.findByPk(
                cursorQuery,
                {
                    attributes: ['historyId'],
                    rejectOnEmpty: true,
                },
            );

            where = {
                ...where,
                historyId: {
                    [Op.lt]: cursor.historyId,
                },
            };
        }

        const results = await OutTransactionHistory.findAll({
            where: where,
            order: [
                ['historyId', 'DESC'],
            ],
            limit: 100,
        });

        res.status(200).json({
            count: count,
            results: results,
        });
    } catch (error: any) {
        next(error);
    }
});

router.put('/:id', adminRequiredMiddleware, async function (req: Request, res: Response, next: NextFunction) {
    try {
        const result = await sequelize.transaction(async (t) => {
            const outTransaction = await OutTransaction.findByPk(
                req.params.id,
                {
                    include: [OutTransfer],
                    rejectOnEmpty: true,
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                },
            );

            if (outTransaction.void && !req.body.void) {
                throw new ValidationError('Out-Transaction already void.');
            }

            let voided = false;
            if (!outTransaction.void && req.body.void) {
                voided = true;
            }

            outTransaction.customer = req.body.customer;
            outTransaction.deliveryReceipt = req.body.deliveryReceipt;
            outTransaction.dateOfDeliveryReceipt = req.body.dateOfDeliveryReceipt;
            outTransaction.void = req.body.void;
            const updatedOutTransaction = await outTransaction.save({
                transaction: t,
                user: res.locals.user,
            });

            const transaction = await Transaction.findOne({
                where: {
                    outTransaction: outTransaction.id,
                },
                rejectOnEmpty: true,
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            await sequelize.query(
                'UPDATE transactions SET updatedAt = :updatedAt WHERE id = :id',
                {
                    replacements: {
                        id: transaction.id,
                        updatedAt: updatedOutTransaction.updatedAt,
                    },
                    type: QueryTypes.UPDATE,
                    transaction: t,
                },
            );

            if (voided) {
                for (const outTransfer of outTransaction.OutTransfers!) {
                    await sequelize.query(
                        'UPDATE out_transfers SET updatedAt = :updatedAt WHERE id = :id',
                        {
                            replacements: {
                                id: outTransfer.id,
                                updatedAt: updatedOutTransaction.updatedAt,
                            },
                            type: QueryTypes.UPDATE,
                            transaction: t,
                        },
                    );

                    const transfer = await Transfer.findOne({
                        where: {
                            inTransfer: outTransfer.id,
                        },
                        rejectOnEmpty: true,
                        transaction: t,
                        lock: t.LOCK.UPDATE,
                    });

                    await sequelize.query(
                        'UPDATE transfers SET updatedAt = :updatedAt WHERE id = :id',
                        {
                            replacements: {
                                id: transfer.id,
                                updatedAt: updatedOutTransaction.updatedAt,
                            },
                            type: QueryTypes.UPDATE,
                            transaction: t,
                        },
                    );

                    let item = await Item.findByPk(
                        outTransfer.item,
                        {
                            rejectOnEmpty: true,
                            transaction: t,
                            lock: t.LOCK.UPDATE,
                        },
                    );

                    await sequelize.query(
                        'UPDATE items SET updatedAt = :updatedAt WHERE id = :id',
                        {
                            replacements: {
                                id: item.id,
                                updatedAt: updatedOutTransaction.updatedAt,
                            },
                            type: QueryTypes.UPDATE,
                            transaction: t,
                        },
                    );

                    item = await item.reload({
                        transaction: t,
                        lock: t.LOCK.UPDATE,
                    });

                    item.stock = item.stock + outTransfer.quantity;
                    await item.save(
                        {
                            transaction: t,
                            silent: true,
                            user: res.locals.user,
                        },
                    );
                }
            }

            return outTransaction;
        });

        res.status(200).json(result.id);
    } catch (error: any) {
        next(error);
    }
});

// router.delete('/:id', adminRequiredMiddleware, async function (req: Request, res: Response, next: NextFunction) {
//     try {
//         const result = await sequelize.transaction(async (t) => {
//             const outTransaction = await OutTransaction.findByPk(
//                 req.params.id,
//                 {
//                     include: [OutTransfer],
//                     rejectOnEmpty: true,
//                     transaction: t,
//                 },
//             );

//             await outTransaction.destroy({ transaction: t });

//             return outTransaction;
//         });

//         res.status(200).json(result.id);
//     } catch (error: any) {
//         next(error);
//     }
// });

export default router;