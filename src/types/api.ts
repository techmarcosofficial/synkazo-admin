/** Standard envelope returned by all NestJS API endpoints */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

/** Paginated list envelope */
export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
}

/** Shape of Axios error responses from the backend */
export interface ApiError {
  response?: {
    status: number;
    data?: {
      message?: string | string[];
      error?: string;
    };
  };
  message?: string;
}
