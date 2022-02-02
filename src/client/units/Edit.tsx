import SaveIcon from '@mui/icons-material/Save';
import DateTimePicker from '@mui/lab/DateTimePicker';
import LoadingButton from '@mui/lab/LoadingButton';
import { Breadcrumbs, Dialog, LinearProgress, Link, Stack, Typography } from '@mui/material';
import TextField from '@mui/material/TextField';
import Box from '@mui/system/Box';
import axios, { AxiosResponse } from 'axios';
import * as React from 'react';
import {
    useLocation,
    useNavigate,
    useParams,
    Link as RouterLink,
} from "react-router-dom";
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ApiEditUnit, EditUnit, Unit } from './Units';
import { DateTime } from 'luxon';
import { useSnackbar } from 'notistack';
import { useAsyncEffect } from 'use-async-effect';

export default function Edit() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const [loading, setLoading] = React.useState(false);
    const [locked, setLocked] = React.useState(false);

    const formik = useFormik<EditUnit>({
        initialValues: {
            name: '',
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
            deletedAt: null,
        },
        validationSchema: Yup.object().shape({
            name: Yup.string()
                .required('Required'),
        }),
        onSubmit: async values => {
            setLocked(true);
            await axios.put<
                { id: string; },
                AxiosResponse<{ id: string; }>,
                ApiEditUnit
            >(
                `/api${location.pathname}/..`,
                {
                    name: values.name,
                })
                .then(result => {
                    navigate(`../${params.unitID}`, { replace: true });
                    enqueueSnackbar('Edit unit successful', { variant: 'success' });
                })
                .catch(error => {
                    enqueueSnackbar('Edit unit failed', { variant: 'error' });
                    if (error.response) {
                        const data = error.response.data;
                        for (const e of data.errors) {
                            formik.setFieldError(e.path, e.message);
                        }
                    }
                })
                .finally(() => {
                    setLocked(false);
                });
        },
    });

    useAsyncEffect(async isActive => {
        setLoading(true);
        await axios.get<Unit>(`/api${location.pathname}/..`)
            .then(result => result.data)
            .then(result => {
                formik.setFieldValue('name', result.name);
                formik.setFieldValue('createdAt', result.createdAt);
                formik.setFieldValue('updatedAt', result.updatedAt);
                formik.setFieldValue('deletedAt', result.deletedAt);
            })
            .catch(error => {
                enqueueSnackbar('Error loading data', { variant: 'error' });
            })
            .finally(() => {
                setLoading(false);
            });
    }, [location.pathname]);

    return (
        <Stack
            sx={{
                boxSizing: 'border-box',
                flex: '1 1 auto',
            }}
        >
            {loading ?
                <LinearProgress />
                :
                <React.Fragment>
                    <Box
                        sx={{
                            display: 'flex',
                            padding: 2,
                        }}
                    >
                        <Stack direction="row" spacing={2}>
                            <Box sx={{ marginTop: 'auto' }}>
                                <Breadcrumbs>
                                    <Link
                                        underline="hover"
                                        color="primary"
                                        component={RouterLink}
                                        to='..'
                                    >
                                        Units
                                    </Link>
                                    <Link
                                        underline="hover"
                                        color="primary"
                                        component={RouterLink}
                                        to={`../${params.unitID}`}
                                    >
                                        {params.unitID}
                                    </Link>
                                    <Typography
                                        color="text.primary"
                                    >
                                        Edit
                                    </Typography>
                                </Breadcrumbs>
                            </Box>
                        </Stack>
                        {
                            formik.dirty &&
                            <Stack
                                direction="row"
                                spacing={2}
                                sx={{ marginLeft: 'auto' }}
                            >
                                <LoadingButton
                                    disabled={!formik.isValid}
                                    loading={locked}
                                    loadingPosition="start"
                                    startIcon={<SaveIcon />}
                                    variant="contained"
                                    onClick={() => { formik.submitForm(); }}
                                >
                                    Save
                                </LoadingButton>
                                <Dialog
                                    open={locked}
                                />
                            </Stack>
                        }
                    </Box>
                    {
                        formik.dirty &&
                        <Stack
                            spacing={2}
                            sx={{
                                paddingX: 2,
                            }}
                        >
                            <Typography
                                variant='caption'
                                // color='text.secondary'
                                display='block'
                            >
                                * Required
                            </Typography>
                            <TextField
                                autoFocus
                                margin="dense"
                                id="name"
                                label="Name*"
                                type="text"
                                fullWidth
                                variant="filled"
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched.name && Boolean(formik.errors.name)}
                                helperText={formik.touched.name && formik.errors.name}
                            />
                            <DateTimePicker
                                label="Created At"
                                value={formik.values.createdAt}
                                onChange={() => { }}
                                readOnly={true}
                                disabled={true}
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
                                value={formik.values.updatedAt}
                                onChange={() => { }}
                                readOnly={true}
                                disabled={true}
                                renderInput={(params) =>
                                    <TextField
                                        {...params}
                                        fullWidth
                                        variant="filled"
                                    />
                                }
                            />
                            <DateTimePicker
                                label="Deleted At"
                                value={formik.values.deletedAt}
                                onChange={() => { }}
                                readOnly={true}
                                disabled={true}
                                renderInput={(params) =>
                                    <TextField
                                        {...params}
                                        fullWidth
                                        variant="filled"
                                    />
                                }
                            />
                        </Stack>
                    }
                </React.Fragment>
            }
        </Stack>
    );
};