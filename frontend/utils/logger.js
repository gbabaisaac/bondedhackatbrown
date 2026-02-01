import * as Sentry from '@sentry/react-native';

/**
 * Logger Utility
 * 
 * Provides centralized logging with environment-aware verbosity.
 * - DEV: Logs all levels to console.
 * - PROD: Suppresses debug/info, sends warn/error to console and Sentry.
 */
export class LoggerService {
    constructor(config = {}) {
        this.isDev = config.isDev !== undefined ? config.isDev : __DEV__;
    }

    debug(...args) {
        if (this.isDev) {
            console.debug('[DEBUG]', ...args);
        }
    }

    info(...args) {
        if (this.isDev) {
            console.info('[INFO]', ...args);
        }
    }

    warn(message, ...args) {
        // Always log warning to console
        console.warn('[WARN]', message, ...args);

        // In production, capture as message
        if (!this.isDev) {
            Sentry.captureMessage(typeof message === 'string' ? message : JSON.stringify(message), 'warning');
        }
    }

    error(error, ...args) {
        // Always log error to console
        console.error('[ERROR]', error, ...args);

        // In production, capture exception
        if (!this.isDev) {
            Sentry.captureException(error, { extra: { args } });
        }
    }
}

export const Logger = new LoggerService();
