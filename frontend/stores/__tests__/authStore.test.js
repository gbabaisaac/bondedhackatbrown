import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from '../authStore';

// Access the actual store to reset it between tests
// created by zustand/persist middleware
const initialState = useAuthStore.getState();

describe('authStore', () => {
    beforeEach(async () => {
        // Reset state before each test
        act(() => {
            useAuthStore.setState(initialState, true);
        });
        // Clear async storage mock
        jest.clearAllMocks();
        await AsyncStorage.clear();
    });

    it('should have correct initial state', () => {
        const { result } = renderHook(() => useAuthStore());
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.email).toBe('');
    });

    it('should update user and authentication status', () => {
        const { result } = renderHook(() => useAuthStore());
        const mockUser = { id: '123', email: 'test@example.com' };

        act(() => {
            result.current.setUser(mockUser);
        });

        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
    });

    it('should update session', () => {
        const { result } = renderHook(() => useAuthStore());
        const mockSession = { access_token: 'abc', refresh_token: 'def' };

        act(() => {
            result.current.setSession(mockSession);
        });

        expect(result.current.session).toEqual(mockSession);
    });

    it('should update email', () => {
        const { result } = renderHook(() => useAuthStore());

        act(() => {
            result.current.setEmail('test@example.com');
        });

        expect(result.current.email).toBe('test@example.com');
    });

    it('should update campus info', () => {
        const { result } = renderHook(() => useAuthStore());

        act(() => {
            result.current.setCampusInfo('campus-123', 'uni.edu');
        });

        expect(result.current.campusId).toBe('campus-123');
        expect(result.current.campusDomain).toBe('uni.edu');
    });

    it('should logout and clear state', async () => {
        const { result } = renderHook(() => useAuthStore());

        // Set some state first
        act(() => {
            result.current.setUser({ id: '123' });
            result.current.setSession({ token: 'abc' });
        });

        // Verify state is set
        expect(result.current.isAuthenticated).toBe(true);

        // Logout
        await act(async () => {
            await result.current.logout();
        });

        // Verify reset
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);

        // Verify storage was cleared
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth-storage');
    });
});
