import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

// SuccessInterceptor가 모든 성공 응답을 { success, data, timestamp }로 감싸므로
// 문서에도 껍데기를 그대로 그리고 data 자리에만 실제 DTO를 끼워 넣는다.
// (@ApiOkResponse({ type })만 쓰면 껍데기 없는 형태로 잘못 문서화됨)
export function ApiSuccessResponse(
  model: Type<unknown>,
  options: { status?: number; isArray?: boolean; description?: string } = {},
) {
  const { status = 200, isArray = false, description } = options;

  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          data: isArray
            ? { type: 'array', items: { $ref: getSchemaPath(model) } }
            : { $ref: getSchemaPath(model) },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    }),
  );
}
