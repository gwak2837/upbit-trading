# upbit-trading

업비트 자동 매매

## 오류

### 주문하기

```
{
  error: {
    message: 'Jwt의 query를 검증하는데 실패하였습니다.',
    name: 'invalid_query_payload'
  }
}
```

입력값을 잘못 넣어줘서

## 할일

- [*] 일정 시간마다 일정 개수의 매도 대기 주문 취소 후 물량 합쳐서 매도 주문 가격 평균가로 다시 매도 주문하기
