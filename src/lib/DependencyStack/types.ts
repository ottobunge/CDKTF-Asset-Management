import { BaseStackProps, DependecyAttributes } from "../BaseStack/types";

/**
 * Configuration properties for DependencyStack
 * @extends BaseStackProps
 */
export interface DependencyStackProps extends BaseStackProps {
    /**
     * Key-value pairs of dependencies to be stored in AWS Secrets Manager
     * Each key represents a unique identifier for a set of dependencies
     */
    settings: {
        subnetIds: string[];
        vpcId: string;
        dependencySecretNamePrefix: string;
    }
    dependencies: {
        [key: string]: Partial<DependecyAttributes>;
    };
}