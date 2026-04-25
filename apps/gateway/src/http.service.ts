import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { randomUUID } from 'crypto';

@Injectable()
export class HttpService {
  private readonly logger = new Logger(HttpService.name);

  private buildHeaders(
    extra?: Record<string, string>,
    requestId?: string,
  ): Record<string, string> {
    const id = requestId ?? randomUUID();
    return {
      'Content-Type': 'application/json',
      'x-request-id': id,
      ...extra,
    };
  }

  async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    const requestId = headers?.['x-request-id'] ?? randomUUID();
    const mergedHeaders = this.buildHeaders(headers, requestId);

    this.logger.log(`GET ${url} [x-request-id=${requestId}]`);

    const config: AxiosRequestConfig = { headers: mergedHeaders };
    const response = await axios.get<T>(url, config);

    this.logger.log(`GET ${url} -> ${response.status}`);
    return response.data;
  }

  async post<T>(
    url: string,
    data: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const requestId = headers?.['x-request-id'] ?? randomUUID();
    const mergedHeaders = this.buildHeaders(headers, requestId);

    this.logger.log(`POST ${url} [x-request-id=${requestId}]`);

    const config: AxiosRequestConfig = { headers: mergedHeaders };
    const response = await axios.post<T>(url, data, config);

    this.logger.log(`POST ${url} -> ${response.status}`);
    return response.data;
  }

  async patch<T>(
    url: string,
    data: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    const requestId = headers?.['x-request-id'] ?? randomUUID();
    const mergedHeaders = this.buildHeaders(headers, requestId);

    this.logger.log(`PATCH ${url} [x-request-id=${requestId}]`);

    const config: AxiosRequestConfig = { headers: mergedHeaders };
    const response = await axios.patch<T>(url, data, config);

    this.logger.log(`PATCH ${url} -> ${response.status}`);
    return response.data;
  }
}
