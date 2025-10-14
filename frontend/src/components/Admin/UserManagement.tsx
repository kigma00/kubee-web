import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { userAPI, authAPI } from '../../services/api';
import { User } from '../../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'security' | 'admin',
  });

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userAPI.getUsers();
      setUsers(response.data.users || []);
    } catch (err: any) {
      setError('사용자 목록을 불러오는데 실패했습니다.');
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeleteUser = async (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await userAPI.deleteUser(userToDelete.id.toString());
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      setError('사용자 삭제에 실패했습니다.');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    try {
      await userAPI.createUser(newUser);
      setNewUser({ username: '', email: '', password: '', role: 'user' });
      setAddDialogOpen(false);
      loadUsers(); // 목록 새로고침
    } catch (err: any) {
      setError('사용자 등록에 실패했습니다.');
    }
  };

  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setEditDialogOpen(true);
  };

  const confirmEditUser = async (newRole: string) => {
    if (!userToEdit) return;

    try {
      await userAPI.updateUserRole(userToEdit.id.toString(), newRole);
      setUsers(users.map(u => 
        u.id === userToEdit.id ? { ...u, role: newRole as 'user' | 'security' | 'admin' } : u
      ));
      setEditDialogOpen(false);
      setUserToEdit(null);
    } catch (err: any) {
      setError('사용자 역할 변경에 실패했습니다.');
    }
  };

  const getRoleChip = (role: string) => {
    const roleConfig = {
      admin: { color: 'error' as const, label: '관리자' },
      security: { color: 'warning' as const, label: '보안' },
      user: { color: 'primary' as const, label: '사용자' },
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.user;

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">👥 사용자 관리</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadUsers}
            disabled={isLoading}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            사용자 추가
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 사용자 목록 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            등록된 사용자 목록
          </Typography>
          
          {users.length === 0 ? (
            <Alert severity="info">등록된 사용자가 없습니다.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>사용자명</TableCell>
                    <TableCell>이메일</TableCell>
                    <TableCell align="center">역할</TableCell>
                    <TableCell align="center">상태</TableCell>
                    <TableCell>가입일</TableCell>
                    <TableCell align="center">액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          👤 {user.username}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.email}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {getRoleChip(user.role)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label="활성"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(user.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="역할 변경">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditUser(user)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="사용자 삭제">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 사용자 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          ⚠️ 사용자 삭제 확인
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            정말로 <strong style={{ color: '#f87171' }}>{userToDelete?.username}</strong> 사용자를 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            취소
          </Button>
          <Button
            onClick={confirmDeleteUser}
            color="error"
            variant="contained"
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 사용자 추가 다이얼로그 */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon />
            새 사용자 등록
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="사용자명"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="비밀번호"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>역할</InputLabel>
                <Select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  label="역할"
                >
                  <MenuItem value="user">사용자</MenuItem>
                  <MenuItem value="security">보안</MenuItem>
                  <MenuItem value="admin">관리자</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)}>
            취소
          </Button>
          <Button
            onClick={handleAddUser}
            variant="contained"
            startIcon={<PersonAddIcon />}
          >
            사용자 추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 사용자 역할 변경 다이얼로그 */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            사용자 역할 변경
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <strong>{userToEdit?.username}</strong> 사용자의 역할을 변경하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            현재 역할: <strong>{userToEdit?.role}</strong>
          </Typography>
          
          <FormControl fullWidth>
            <InputLabel>새로운 역할</InputLabel>
            <Select
              defaultValue={userToEdit?.role || 'user'}
              onChange={(e) => {
                if (userToEdit) {
                  confirmEditUser(e.target.value);
                }
              }}
              label="새로운 역할"
            >
              <MenuItem value="user">사용자</MenuItem>
              <MenuItem value="security">보안 담당자</MenuItem>
              <MenuItem value="admin">관리자</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)}>
            취소
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
