import { BaseStackProps, DependecyAttributes } from "../BaseStack/types";

export interface DependencyStackProps extends BaseStackProps {
    dependencies: {
        [key: string]: DependecyAttributes;
    };
}