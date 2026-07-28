import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ApiSuccessResponse } from './api-success-response.decorator';

class DummyDTO {
  @ApiProperty()
  id: string;
}

// @nestjs/swagger는 메서드 데코레이터 메타데이터를 프로토타입이 아니라 함수 자체에 붙인다.
function responseMeta(method: () => void) {
  return Reflect.getMetadata('swagger/apiResponse', method) as Record<
    string,
    { schema: { properties: Record<string, unknown> } }
  >;
}

describe('ApiSuccessResponse', () => {
  class Ctrl {
    @ApiSuccessResponse(DummyDTO, { status: 201 })
    one(this: void) {}

    @ApiSuccessResponse(DummyDTO, { isArray: true })
    many(this: void) {}
  }

  it('SuccessInterceptor 껍데기를 문서화하고 data에 DTO를 넣는다', () => {
    const meta = responseMeta(Ctrl.prototype.one);
    expect(Object.keys(meta)).toEqual(['201']);
    expect(meta['201'].schema.properties).toEqual({
      success: { type: 'boolean', example: true },
      data: { $ref: getSchemaPath(DummyDTO) },
      timestamp: { type: 'string', format: 'date-time' },
    });
  });

  it('isArray면 data가 배열, status 기본값은 200', () => {
    const meta = responseMeta(Ctrl.prototype.many);
    expect(Object.keys(meta)).toEqual(['200']);
    expect(meta['200'].schema.properties.data).toEqual({
      type: 'array',
      items: { $ref: getSchemaPath(DummyDTO) },
    });
  });
});
