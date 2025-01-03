export interface BaseStackProps {
    accountId: string;
    region: string;
    environment: string;
    backendBucket: string;
}

export enum Dependencies {
    DATABASE = "DATABASE",
    SENTRY = "SENTRY",
}

export interface DependecyAttributes {
    [Dependencies.DATABASE]: {
        url: string;
        username: string;
        password: string;
    };
    [Dependencies.SENTRY]: {
        dsn: string;
    };
}
