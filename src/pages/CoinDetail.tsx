import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import Header from '../components/layout/Header';
import TradingViewWidget from '../components/TradingViewWidget';
import PriceInfo from '../components/PriceInfo'; // 수정된 PriceInfo 컴포넌트 임포트

import useUpbitWebSocket from '../hooks/useUpbitWebSocket';
import { formatCurrency, formatVolume } from '../utils/formatter';

// 코인 정보 인터페이스
interface CoinData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  isFavorite: boolean;
}

// 차트 컴포넌트를 메모이제이션
const Chart = memo(
  ({ ticker, timeframe }: { ticker: string; timeframe: string }) => {
    // 타임프레임을 TradingView 형식으로 변환
    const getTradingViewInterval = (tf: string) => {
      switch (tf) {
        case '1D':
          return '60';
        case '1W':
          return '240';
        case '1M':
          return 'D';
        case '1Y':
          return 'W';
        default:
          return '60';
      }
    };

    // 심볼 형식 변환 (BTC -> UPBIT:BTCKRW)
    const symbol = `UPBIT:${ticker}KRW`;

    return (
      <div className="w-full h-[400px] border-b bg-gray-50">
        <TradingViewWidget
          symbol={symbol}
          theme="light"
          interval={getTradingViewInterval(timeframe)}
          locale="kr"
          width="100%"
        />
      </div>
    );
  },
);

export default function CoinDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();

  const [coin, setCoin] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1D');

  // ticker가 undefined일 경우 기본값으로 'BTC' 사용
  const symbolToUse = ticker || 'BTC';

  // useUpbitWebSocket 훅 사용
  const { tickerData, isConnected } = useUpbitWebSocket([symbolToUse]);

  // 예시 코인 데이터 설정 (실제로는 API에서 가져옴)
  useEffect(() => {
    // 실제 구현에서는 API를 통해 코인 정보를 가져오는 로직 필요
    const fetchCoinData = async () => {
      try {
        // 임시 데이터 (실제로는 API 호출)
        const exampleCoin: CoinData = {
          id: symbolToUse.toLowerCase(),
          name:
            symbolToUse === 'BTC'
              ? '비트코인'
              : symbolToUse === 'ETH'
                ? '이더리움'
                : `${symbolToUse} 코인`,
          symbol: symbolToUse,
          price: 0, // 웹소켓에서 업데이트됨
          priceChange24h: 0, // 웹소켓에서 업데이트됨
          volume24h: 0, // 웹소켓에서 업데이트됨
          marketCap: 0,
          high24h: 0, // 웹소켓에서 업데이트됨
          low24h: 0, // 웹소켓에서 업데이트됨
          isFavorite: false, // 로컬 스토리지 등에서 관리 가능
        };

        setCoin(exampleCoin);
        setLoading(false);
      } catch (err) {
        setError('코인 정보를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    fetchCoinData();
  }, [symbolToUse]);

  // 즐겨찾기 토글 함수
  const toggleFavorite = useCallback(() => {
    setCoin((prevCoin) => {
      if (!prevCoin) return null;
      return {
        ...prevCoin,
        isFavorite: !prevCoin.isFavorite,
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="로딩 중..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !coin) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="오류" />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-500 mb-4">
              {error || '코인 정보를 불러올 수 없습니다.'}
            </p>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              onClick={() => navigate(-1)}
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <Header
        title={coin.name}
        rightElement={
          <button onClick={toggleFavorite} className="p-2">
            {coin.isFavorite ? (
              <FaHeart className="text-red-400 text-xl" />
            ) : (
              <FaRegHeart className="text-gray-400 text-xl" />
            )}
          </button>
        }
      />

      {/* PriceInfo 컴포넌트 사용 */}
      <PriceInfo
        symbol={symbolToUse}
        tickerData={tickerData}
        name={coin.name}
        onFavoriteToggle={toggleFavorite}
        isFavorite={coin.isFavorite}
      />

      {/* 차트 타임프레임 선택 */}
      <div className="p-4 border-b flex dark:bg-gray-800 dark:text-white dark:border-gray-700">
        {(['1D', '1W', '1M', '1Y'] as const).map((tf) => (
          <button
            key={tf}
            className={`flex-1 py-2 text-center ${
              timeframe === tf
                ? 'text-blue-500 border-b-2 border-blue-500 font-medium dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => setTimeframe(tf)}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* 차트 */}
      <Chart ticker={symbolToUse} timeframe={timeframe} />

      {/* 코인 상세 정보 */}
      {tickerData && tickerData[`KRW-${symbolToUse}`] && (
        <div className="p-4">
          <h2 className="text-lg font-bold mb-4">코인 정보</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">최고가 (24h)</span>
              <span>
                {formatCurrency(tickerData[`KRW-${symbolToUse}`].high_price)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">최저가 (24h)</span>
              <span>
                {formatCurrency(tickerData[`KRW-${symbolToUse}`].low_price)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">거래대금 (24h)</span>
              <span>
                {formatVolume(
                  tickerData[`KRW-${symbolToUse}`].acc_trade_price_24h,
                )}{' '}
                원
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">거래량 (24h)</span>
              <span>
                {tickerData[`KRW-${symbolToUse}`].acc_trade_volume_24h.toFixed(
                  2,
                )}{' '}
                {symbolToUse}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 매수/매도 버튼 */}
      <div className="p-4 mt-auto">
        <div className="flex space-x-4">
          <button
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium"
            onClick={() => navigate(`/coins/${ticker}/buy`)}
          >
            매수
          </button>
          <button
            className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium"
            onClick={() => navigate(`/coins/${ticker}/sell`)}
          >
            매도
          </button>
        </div>
      </div>
    </div>
  );
}
