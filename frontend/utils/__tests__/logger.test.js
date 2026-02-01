import * as Sentry from '@sentry/react-native';
import { LoggerService } from '../logger';

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
    captureMessage: jest.fn(),
    captureException: jest.fn(),
}));

// Mock console methods
global.console = {
    ...global.console,
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

describe('Logger Utility', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('in Development (isDev = true)', () => {
        const Logger = new LoggerService({ isDev: true });

        it('should log debug messages', () => {
            Logger.debug('test debug');
            expect(console.debug).toHaveBeenCalledWith('[DEBUG]', 'test debug');
        });

        it('should log info messages', () => {
            Logger.info('test info');
            expect(console.info).toHaveBeenCalledWith('[INFO]', 'test info');
        });

        it('should NOT send warnings to Sentry', () => {
            Logger.warn('test warn');
            expect(console.warn).toHaveBeenCalledWith('[WARN]', 'test warn');
            expect(Sentry.captureMessage).not.toHaveBeenCalled();
        });

        it('should NOT send errors to Sentry', () => {
            const err = new Error('test error');
            Logger.error(err);
            expect(console.error).toHaveBeenCalledWith('[ERROR]', err);
            expect(Sentry.captureException).not.toHaveBeenCalled();
        });
    });

    describe('in Production (isDev = false)', () => {
        const Logger = new LoggerService({ isDev: false });

        it('should suppress debug messages', () => {
            Logger.debug('test debug');
            expect(console.debug).not.toHaveBeenCalled();
        });

        it('should suppress info messages', () => {
            Logger.info('test info');
            expect(console.info).not.toHaveBeenCalled();
        });

        it('should send warnings to Sentry', () => {
            Logger.warn('test warn');
            expect(console.warn).toHaveBeenCalledWith('[WARN]', 'test warn');
            expect(Sentry.captureMessage).toHaveBeenCalledWith('test warn', 'warning');
        });

        it('should send errors to Sentry', () => {
            const err = new Error('test error');
            Logger.error(err);
            expect(console.error).toHaveBeenCalledWith('[ERROR]', err);
            expect(Sentry.captureException).toHaveBeenCalledWith(err, expect.any(Object));
        });
    });
});
