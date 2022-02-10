import { Add as AddIcon, Search as SearchIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  LinearProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import axios, { CancelToken, CancelTokenSource } from "axios";
import { debounce } from "lodash";
import { DateTime } from "luxon";
import { useSnackbar } from "notistack";
import * as React from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../Context";
import { FilterMenu } from "../FilterMenu";
import { Android12Switch } from "../Switch";
import { User } from "./Users";

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  React.useEffect(() => {
    document.title = `Users`;
  }, []);

  const [authContext] = React.useContext(AuthContext);

  const [search, setSearch] = React.useState<string>("");
  const [filterMenuShowDeleted, setFilterMenuShowDeleted] =
    React.useState<boolean>(false);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<{
    by: string;
    direction: "asc" | "desc";
  }>({ by: "updatedAt", direction: "desc" });

  const [loading, setLoading] = React.useState(false);
  const cancelTokenSourceRef = React.useRef<CancelTokenSource | null>(null);

  const [count, setCount] = React.useState<number | null>(null);
  const [users, setUsers] = React.useState<User[]>([]);

  const queryUsers = React.useMemo(
    () =>
      debounce(
        async (
          request: {
            search: string;
            filters: {
              showDeleted: boolean;
            };
            order: {
              by: string;
              direction: string;
            };
          },
          startCallback: () => void,
          callback: (results: { count: number; results: User[] }) => void,
          errorCallback: () => void,
          finallyCallback: () => void,
          cancelToken: CancelToken
        ) => {
          startCallback();
          await axios
            .get<{ count: number; results: User[] }>(
              `/api${location.pathname}`,
              {
                params: request,
                cancelToken: cancelToken,
              }
            )
            .then((result) => result.data)
            .then((data) => {
              callback(data);
            })
            .catch((error) => {
              if (axios.isCancel(error)) return;
              errorCallback();
            })
            .finally(() => {
              finallyCallback();
            });
        },
        200
      ),
    [location.pathname]
  );

  React.useEffect(() => {
    if (cancelTokenSourceRef.current !== null) {
      cancelTokenSourceRef.current.cancel();
      cancelTokenSourceRef.current = null;
    }

    const cancelTokenSource = axios.CancelToken.source();
    queryUsers(
      {
        search: search,
        filters: {
          showDeleted: filterMenuShowDeleted,
        },
        order: order,
      },
      () => {
        setCount(null);
        setUsers([]);
        setLoading(true);
      },
      (data) => {
        setCount(data.count);
        setUsers(data.results);
        if (data.results.length === data.count) {
          setCursor(null);
        } else if (data.results.length !== 0) {
          setCursor(data.results[data.results.length - 1].id);
        } else {
          setCursor(null);
        }
        setLoading(false);
      },
      () => {
        enqueueSnackbar("Error loading data", { variant: "error" });
      },
      () => {
        setLoading(false);
      },
      cancelTokenSource.token
    );

    return () => {
      cancelTokenSource.cancel();
    };
  }, [queryUsers, search, filterMenuShowDeleted, order]);

  async function handleLoadMoreClick() {
    setLoading(true);
    const source = axios.CancelToken.source();
    cancelTokenSourceRef.current = source;
    await axios
      .get<{ count: number; results: User[] }>(`/api${location.pathname}`, {
        params: {
          search: search,
          filters: {
            showDeleted: filterMenuShowDeleted,
          },
          cursor: cursor,
        },
        cancelToken: source.token,
      })
      .then((result) => result.data)
      .then((data) => {
        setCount(data.count);
        const newUsers = [...users, ...data.results];
        setUsers(newUsers);
        if (newUsers.length === data.count) {
          setCursor(null);
        } else if (data.results.length !== 0) {
          setCursor(data.results[data.results.length - 1].id);
        } else {
          setCursor(null);
        }
      })
      .catch((error) => {
        if (axios.isCancel(error)) return;
        enqueueSnackbar("Error loading data", { variant: "error" });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function handleChangeSort(defaultOrder: {
    by: string;
    direction: "asc" | "desc";
  }) {
    if (order.by === defaultOrder.by) {
      setOrder({
        ...order,
        direction: order.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setOrder(defaultOrder);
    }
  }

  const rows = React.useMemo(() => {
    return users.map((row: any) => (
      <TableRow
        key={row.name}
        sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
      >
        <TableCell>
          <Tooltip title={row.id} placement="right">
            <Link
              underline="none"
              component={RouterLink}
              to={row.id}
              color={"text.primary"}
            >
              <Typography fontFamily="monospace" variant="body2">
                {row.id.substring(0, 8)}
              </Typography>
            </Link>
          </Tooltip>
        </TableCell>
        <TableCell>
          <Typography fontFamily="monospace" variant="body2">
            {row.username}
          </Typography>
        </TableCell>
        <TableCell>{row.firstName}</TableCell>
        <TableCell>{row.lastName}</TableCell>
        <TableCell align="right">
          <Typography fontFamily="monospace" variant="body2">
            {row.admin.toString()}
          </Typography>
        </TableCell>
        <TableCell
          align="right"
          dangerouslySetInnerHTML={{
            __html: DateTime.fromISO(row.createdAt)
              .toLocal()
              .toFormat(
                "ccc, LLL'&nbsp;'dd,'&nbsp;'yyyy, hh:mm:ss.SSS'&nbsp;'a"
              ),
          }}
        />
        <TableCell
          align="right"
          dangerouslySetInnerHTML={{
            __html: DateTime.fromISO(row.updatedAt)
              .toLocal()
              .toFormat(
                "ccc, LLL'&nbsp;'dd,'&nbsp;'yyyy, hh:mm:ss.SSS'&nbsp;'a"
              ),
          }}
        />
        {filterMenuShowDeleted && (
          <TableCell
            align="right"
            dangerouslySetInnerHTML={{
              __html:
                row.deletedAt !== null
                  ? DateTime.fromISO(row.deletedAt)
                      .toLocal()
                      .toFormat(
                        "ccc, LLL'&nbsp;'dd,'&nbsp;'yyyy, hh:mm:ss.SSS'&nbsp;'a"
                      )
                  : "",
            }}
          />
        )}
      </TableRow>
    ));
  }, [users]);

  return (
    <Stack
      sx={{
        boxSizing: "border-box",
        flex: "1 1 auto",
      }}
    >
      <Box
        sx={{
          display: "flex",
          padding: 2,
        }}
      >
        <Stack direction="row" spacing={2}>
          <TextField
            sx={{ width: 250 }}
            size="small"
            label="Search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            InputProps={{
              type: "search",
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          {authContext?.user.admin && (
            <FilterMenu highlighted={Boolean(filterMenuShowDeleted)}>
              <Stack
                spacing={2}
                sx={{
                  paddingX: 2,
                  paddingY: 2,
                }}
              >
                <Typography
                  sx={{
                    flex: "1 1 auto",
                    userSelect: "none",
                  }}
                  variant="subtitle1"
                  component="div"
                >
                  Filters
                </Typography>
                <Divider />
                <FormGroup>
                  <FormControlLabel
                    label="Show Deleted"
                    sx={{
                      userSelect: "none",
                    }}
                    control={
                      <Android12Switch
                        checked={filterMenuShowDeleted}
                        onChange={(event) => {
                          setFilterMenuShowDeleted(event.target.checked);
                        }}
                      />
                    }
                  />
                </FormGroup>
              </Stack>
            </FilterMenu>
          )}
        </Stack>
        <Stack direction="row" spacing={2} sx={{ marginLeft: "auto" }}>
          {authContext?.user.admin && (
            <Box>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                component={RouterLink}
                to={`create`}
              >
                Add
              </Button>
            </Box>
          )}
        </Stack>
      </Box>
      <TableContainer
        sx={{
          flex: "1 1 auto",
          overflowY: "scroll",
          minHeight: "360px",
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>
                <TableSortLabel
                  active={order.by === "username"}
                  direction={order.by === "username" ? order.direction : "asc"}
                  onClick={() => {
                    handleChangeSort({ by: "username", direction: "asc" });
                  }}
                >
                  Username
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={order.by === "firstName"}
                  direction={order.by === "firstName" ? order.direction : "asc"}
                  onClick={() => {
                    handleChangeSort({ by: "firstName", direction: "asc" });
                  }}
                >
                  First Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={order.by === "lastName"}
                  direction={order.by === "lastName" ? order.direction : "asc"}
                  onClick={() => {
                    handleChangeSort({ by: "lastName", direction: "asc" });
                  }}
                >
                  Last Name
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={order.by === "admin"}
                  direction={order.by === "admin" ? order.direction : "asc"}
                  onClick={() => {
                    handleChangeSort({ by: "admin", direction: "asc" });
                  }}
                >
                  Admin
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={order.by === "createdAt"}
                  direction={
                    order.by === "createdAt" ? order.direction : "desc"
                  }
                  onClick={() => {
                    handleChangeSort({ by: "createdAt", direction: "desc" });
                  }}
                >
                  Created At
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={order.by === "updatedAt"}
                  direction={
                    order.by === "updatedAt" ? order.direction : "desc"
                  }
                  onClick={() => {
                    handleChangeSort({ by: "updatedAt", direction: "desc" });
                  }}
                >
                  Updated At
                </TableSortLabel>
              </TableCell>
              {filterMenuShowDeleted && (
                <TableCell align="right">
                  <TableSortLabel
                    active={order.by === "deletedAt"}
                    direction={
                      order.by === "deletedAt" ? order.direction : "desc"
                    }
                    onClick={() => {
                      handleChangeSort({ by: "deletedAt", direction: "desc" });
                    }}
                  >
                    Deleted At
                  </TableSortLabel>
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {count !== null && (
              <TableRow>
                <TableCell
                  colSpan={7 + (filterMenuShowDeleted ? 1 : 0)}
                  align="right"
                  sx={{ background: "rgba(0, 0, 0, 0.06)" }}
                >
                  <Typography fontFamily="monospace" variant="overline">
                    {count} {count === 1 ? "item" : "items"}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows}
            {loading ||
              (cursor && (
                <TableRow
                  onClick={() => {
                    handleLoadMoreClick();
                  }}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell
                    colSpan={7 + (filterMenuShowDeleted ? 1 : 0)}
                    align="center"
                    sx={{ background: "rgba(0, 0, 0, 0.06)" }}
                  >
                    <Typography variant="button">Load More</Typography>
                  </TableCell>
                </TableRow>
              ))}
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={7 + (filterMenuShowDeleted ? 1 : 0)}
                  padding="none"
                >
                  <LinearProgress />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
