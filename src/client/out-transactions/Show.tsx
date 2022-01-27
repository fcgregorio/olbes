import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DateTimePicker, DesktopDatePicker } from '@mui/lab';
import {
    Box,
    Breadcrumbs,
    Button,
    Divider,
    FormControlLabel,
    FormGroup,
    LinearProgress,
    Link,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Toolbar,
    Tooltip,
    Typography
} from '@mui/material';
import axios, { AxiosResponse, CancelTokenSource } from 'axios';
import { DateTime } from 'luxon';
import * as React from 'react';
import {
    useNavigate,
    useLocation,
    useParams,
    Link as RouterLink,
} from 'react-router-dom';
import { AuthContext } from '../Context';
import { Android12Switch } from '../Switch';
import { OutTransaction, OutTransactionHistory, OutTransfer } from './OutTransactions';

function History() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();

    const [loading, setLoading] = React.useState(false);
    const [cursor, setCursor] = React.useState<number | null>(null);
    const cancelTokenSourceRef = React.useRef<CancelTokenSource | null>(null);
    const [count, setCount] = React.useState<number | null>(null);
    const [outTransactionHistories, setOutTransactionHistories] = React.useState<OutTransactionHistory[]>([]);

    React.useEffect(() => {
        setLoading(true);
        axios.get<{ count: number; results: OutTransactionHistory[]; }>(`/api${location.pathname}/histories`)
            .then(result => result.data)
            .then(
                (data) => {
                    setCount(data.count);
                    setOutTransactionHistories(data.results);
                    if (data.results.length === data.count) {
                        setCursor(null);
                    } else if (data.results.length !== 0) {
                        setCursor(data.results[data.results.length - 1].historyId);
                    } else {
                        setCursor(null);
                    }
                    setLoading(false);
                },
                // Note: it's important to handle errors here
                // instead of a catch() block so that we don't swallow
                // exceptions from actual bugs in components.
                (error) => {
                    setLoading(false);
                }
            )
            .finally(() => {
                setLoading(false);
            });
    }, [location.pathname]);

    function handleLoadMoreClick() {
        setLoading(true);
        const source = axios.CancelToken.source();
        cancelTokenSourceRef.current = source;
        axios.get<{ count: number; results: OutTransactionHistory[]; }>(
            `/api${location.pathname}/histories`,
            {
                params: {
                    cursor: cursor,
                },
                cancelToken: source.token,
            },
        )
            .then(result => result.data)
            .then(
                (data) => {
                    setCount(data.count);
                    const newUnitHistories = [...outTransactionHistories, ...data.results];
                    setOutTransactionHistories(newUnitHistories);
                    if (newUnitHistories.length === data.count) {
                        setCursor(null);
                    } else if (data.results.length !== 0) {
                        setCursor(data.results[data.results.length - 1].historyId);
                    } else {
                        setCursor(null);
                    }
                    setLoading(false);
                },
                // Note: it's important to handle errors here
                // instead of a catch() block so that we don't swallow
                // exceptions from actual bugs in components.
                (error) => {
                    setLoading(false);
                }
            );
    }

    return (
        <Stack spacing={2}
            sx={{
                marginY: 2
            }}>
            <TableContainer>
                <Table sx={{ minWidth: 650 }} size="small" >
                    <TableHead>
                        <TableRow>
                            <TableCell>History ID</TableCell>
                            <TableCell>History User</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>Delivery Receipt</TableCell>
                            <TableCell align="right">Date of Delivery Receipt</TableCell>
                            <TableCell align="right">Void</TableCell>
                            <TableCell align="right">Created At</TableCell>
                            <TableCell align="right">Updated At</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {count !== null &&
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    align='right'
                                    sx={{ background: 'rgba(0, 0, 0, 0.06)' }}
                                >
                                    <Typography
                                        fontFamily='monospace'
                                        variant='overline'
                                    >
                                        {count} {count === 1 ? 'item' : 'items'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        }
                        {outTransactionHistories.map((row: any) => (
                            <TableRow
                                key={row.id}
                                sx={{
                                    '&:last-child td, &:last-child th': { border: 0 },
                                }}
                            >
                                <TableCell>
                                    <Typography fontFamily='monospace'>
                                        {row.historyId}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Tooltip title={row.historyUser} placement="right">
                                        <Link
                                            underline="none"
                                            component={RouterLink}
                                            to={`/users/${row.historyUser}`}
                                            color={'text.primary'}
                                        >
                                            <Typography fontFamily='monospace'>
                                                {row.historyUser.substring(0, 8)}
                                            </Typography>
                                        </Link>
                                    </Tooltip>
                                </TableCell>
                                <TableCell>{row.customer}</TableCell>
                                <TableCell>{row.deliveryReceipt}</TableCell>
                                <TableCell align="right">{row.dateOfDeliveryReceipt !== null ? DateTime.fromISO(row.dateOfDeliveryReceipt).toLocal().toLocaleString(DateTime.DATE_SHORT) : ''}</TableCell>
                                <TableCell align="right">
                                    <Typography fontFamily='monospace'>
                                        {row.void.toString()}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">{DateTime.fromISO(row.createdAt).toLocal().toLocaleString(DateTime.DATETIME_SHORT)}</TableCell>
                                <TableCell align="right">{DateTime.fromISO(row.updatedAt).toLocal().toLocaleString(DateTime.DATETIME_SHORT)}</TableCell>
                            </TableRow>
                        ))}
                        {loading || (cursor &&
                            <TableRow
                                onClick={() => { handleLoadMoreClick(); }}
                                sx={{ cursor: 'pointer' }}
                            >
                                <TableCell
                                    colSpan={8}
                                    align='center'
                                    sx={{ background: 'rgba(0, 0, 0, 0.06)' }}
                                >
                                    <Typography
                                        variant='button'
                                    >
                                        Load More
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {loading &&
                            <TableRow>
                                <TableCell colSpan={8} padding='none'>
                                    <LinearProgress />
                                </TableCell>
                            </TableRow>
                        }
                    </TableBody>
                </Table>
            </TableContainer>
        </Stack>
    );
}

export default function Show() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();

    const [authContext,] = React.useContext(AuthContext);

    const [loading, setLoading] = React.useState(false);
    const [outTransaction, setOutTransaction] = React.useState<OutTransaction | null>(null);

    React.useEffect(() => {
        setLoading(true);
        axios.get<OutTransaction>(`/api${location.pathname}`)
            .then(result => result.data)
            .then(result => {
                    setOutTransaction(result);
                }
            )
            .finally(() => {
                setLoading(false);
            });
    }, [location.pathname]);

    function handleEditOutTransaction() {
        navigate('edit');
    }

    return (
        <Box>
            {loading ?
                <LinearProgress />
                :
                <Stack
                    spacing={2}
                    sx={{
                        marginY: 2
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-start',
                            marginX: 2,
                        }}
                    >
                        <Stack
                            direction="row"
                            spacing={2}
                            sx={{ marginRight: 'auto' }}
                        >
                            <Box sx={{ marginTop: 'auto' }}>
                                <Breadcrumbs>
                                    <Link
                                        underline="hover"
                                        color="inherit"
                                        component={RouterLink}
                                        to='..'
                                    >
                                        Out-Transactions
                                    </Link>
                                    <Typography
                                        color="text.primary"
                                    >
                                        {params.outTransactionID}
                                    </Typography>
                                </Breadcrumbs>
                            </Box>
                        </Stack>
                        {
                            outTransaction !== null &&
                            <Stack
                                direction="row"
                                spacing={2}
                                sx={{ marginLeft: 'auto' }}
                            >
                                {
                                    authContext?.user.admin &&
                                    <React.Fragment>
                                        <Button
                                            startIcon={<EditIcon />}
                                            variant="contained"
                                            onClick={handleEditOutTransaction}
                                        >
                                            Edit
                                        </Button>
                                    </React.Fragment>
                                }
                            </Stack>
                        }
                    </Box>
                    {
                        outTransaction !== null &&
                        <React.Fragment>
                            <Stack
                                spacing={2}
                                sx={{
                                    paddingX: 2,
                                }}
                            >
                                <TextField
                                    margin="dense"
                                    id="customer"
                                    label="Customer"
                                    type="text"
                                    fullWidth
                                    variant="filled"
                                    value={outTransaction!.customer}
                                    InputProps={{
                                        readOnly: true,
                                    }}
                                />
                                <TextField
                                    margin="dense"
                                    id="deliveryReceipt"
                                    label="Delivery Receipt"
                                    type="text"
                                    fullWidth
                                    variant="filled"
                                    value={outTransaction!.deliveryReceipt}
                                    InputProps={{
                                        readOnly: true,
                                    }}
                                />
                                <DesktopDatePicker
                                    label="Date of Delivery Receipt"
                                    inputFormat="MM/dd/yyyy"
                                    value={outTransaction!.dateOfDeliveryReceipt}
                                    onChange={() => { }}
                                    readOnly={true}
                                    renderInput={(params) =>
                                        <TextField
                                            {...params}
                                            fullWidth
                                            variant="filled"
                                        />
                                    }
                                />
                                <FormGroup>
                                    <FormControlLabel
                                        label="Void"
                                        sx={{
                                            userSelect: 'none',
                                        }}
                                        control={
                                            <Android12Switch
                                                readOnly={true}
                                                checked={outTransaction!.void}
                                            />
                                        }
                                    />
                                </FormGroup>
                                <DateTimePicker
                                    label="Created At"
                                    value={outTransaction!.createdAt}
                                    onChange={() => { }}
                                    readOnly={true}
                                    renderInput={(params) =>
                                        <TextField
                                            {...params}
                                            fullWidth
                                            variant="filled"
                                        />
                                    }
                                />
                                <DateTimePicker
                                    label="Updated At"
                                    value={outTransaction!.updatedAt}
                                    onChange={() => { }}
                                    readOnly={true}
                                    renderInput={(params) =>
                                        <TextField
                                            {...params}
                                            fullWidth
                                            variant="filled"
                                        />
                                    }
                                />
                                <Paper
                                    variant='outlined'
                                    sx={{
                                        borderColor: 'rgba(0, 0, 0, 0.42)',
                                    }}
                                >
                                    <Toolbar
                                        disableGutters
                                        sx={{
                                            px: '12px',
                                            backgroundColor: 'rgba(0, 0, 0, 0.06)',
                                            ":hover": {
                                                backgroundColor: 'rgba(0, 0, 0, 0.09)',
                                            },
                                        }}
                                    >
                                        <Typography
                                            sx={{ flex: '1 1 auto' }}
                                            color="inherit"
                                            variant="subtitle1"
                                            component="div"
                                        >
                                            In-Transfers
                                        </Typography>
                                    </Toolbar>
                                    <TableContainer>
                                        <Table sx={{ minWidth: 650 }} size="small" >
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Item ID</TableCell>
                                                    <TableCell>Item Name</TableCell>
                                                    <TableCell align="right">Quantity</TableCell>
                                                    <TableCell>Item Unit</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {outTransaction!.OutTransfers.map((row: OutTransfer) => (
                                                    <TableRow
                                                        key={row.item}
                                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                        <TableCell>
                                                            <Tooltip title={row.item} placement="right">
                                                                <Link
                                                                    underline="none"
                                                                    component={RouterLink}
                                                                    to={`/items/${row.item}`}
                                                                    color={'text.primary'}
                                                                >
                                                                    <Typography fontFamily='monospace'>
                                                                        {row.item.substring(0, 8)}
                                                                    </Typography>
                                                                </Link>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell>{row.Item!.name}</TableCell>
                                                        <TableCell align="right">
                                                            <Typography fontFamily='monospace'>
                                                                {row.quantity}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>{row.Item!.Unit.name}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            </Stack>
                            {
                                authContext?.user.admin &&
                                <React.Fragment>
                                    <Divider />
                                    <History />
                                </React.Fragment>
                            }
                        </React.Fragment>
                    }
                </Stack>
            }
        </Box>
    );
}