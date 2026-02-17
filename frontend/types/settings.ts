/**
 * Application settings types
 */

export interface Settings {
    learning_rate: number;
    batch_size: number;
    physics_loss_weight: number;
    epochs: number;
    theme: 'light' | 'dark';
    notifications_enabled: boolean;
}

export interface UpdateSettingsRequest {
    learning_rate?: number;
    batch_size?: number;
    physics_loss_weight?: number;
    epochs?: number;
    theme?: 'light' | 'dark';
    notifications_enabled?: boolean;
}
