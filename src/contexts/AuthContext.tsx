import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import axios from 'axios';
import api from '../api/clients';
import { API_ENDPOINTS } from '../config/apiEndpoints';

// axios 전역 기본 설정
axios.defaults.withCredentials = true; // 쿠키를 포함하여 요청

interface User {
  id: number;
  nickname: string;
  profileImageUrl: string;
  kakaoId?: number;
  cashBalance?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  withdraw: () => void;
  isAuthenticated: boolean;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // 사용자 정보 로드 함수
  const loadUserInfo = async (isInitialLoad = true) => {
    try {
      if (isInitialLoad) {
        console.log('로그인 상태 확인을 위해 API 호출 시작...');
      } else {
        console.log('인증 코드 감지 후 사용자 정보 다시 로드 중...');
      }

      setLoading(true);

      // 상대 경로로 API 요청 (Vite 프록시 사용)
      const apiUrl = '/api/v1/users/me';
      console.log('API 요청 URL (상대 경로):', apiUrl);

      // 인증 정보와 함께 요청
      const res = await api.get(API_ENDPOINTS.GET_USER);

      console.log('API 응답 데이터:', res.data);

      if (res.data) {
        console.log('사용자 정보 로드 성공:', res.data);
        // API 응답 구조에 맞게 사용자 정보 추출
        const userData = {
          id: res.data.id,
          nickname: res.data.nickname,
          profileImageUrl: res.data.profileImageUrl,
          cashBalance: res.data.cashBalance,
        };
        setUser(userData);
      } else {
        console.log('API 응답에 사용자 데이터가 없음');
        setUser(null);
      }
      setError(null);
    } catch (err) {
      console.error('사용자 정보 로드 실패:', err);

      // 오류 응답 상세 정보 기록
      if (axios.isAxiosError(err)) {
        if (err.response) {
          console.error('오류 상태 코드:', err.response.status);
          console.error('오류 응답 데이터:', err.response.data);

          // 401 또는 403 오류는 인증 실패로 간주
          if (err.response.status === 401 || err.response.status === 403) {
            console.log('인증되지 않은 사용자');
            setUser(null);
          }
        } else if (err.request) {
          // 서버에 요청이 전송되었으나 응답이 없는 경우
          console.error('서버에서 응답이 없음:', err.request);
          console.error('요청 내용:', {
            method: 'GET',
            url: '/api/v1/users/me',
            withCredentials: true,
          });
        } else {
          console.error('요청 설정 중 오류 발생:', err.message);
        }

        // 네트워크 오류이고 첫 로드이며 아직 재시도하지 않은 경우 짧은 지연 후 재시도
        if (err.code === 'ERR_NETWORK' && isInitialLoad && !isRetrying) {
          console.log('네트워크 오류로 3초 후 재시도합니다...');
          setIsRetrying(true);
          setTimeout(() => {
            loadUserInfo(false);
            setIsRetrying(false);
          }, 3000);
        }
      }

      setError('Failed to load user info');
      if (!isRetrying) {
        setLoading(false);
      }
    } finally {
      if (!isRetrying) {
        setLoading(false);
      }
    }
  };

  // 컴포넌트 마운트 시 사용자 정보 로드
  useEffect(() => {
    // URL에 카카오 인증 코드가 있는지 확인 (로그인 직후)
    const params = new URLSearchParams(window.location.search);
    const hasAuthCode = params.has('code');

    if (hasAuthCode) {
      console.log('URL에 인증 코드 감지. 로그인 완료 후 사용자 정보 로드 예정');
      console.log('인증 코드:', params.get('code'));

      const cleanUrl = window.location.pathname; // 쿼리 파라미터 제거

      // 인증 코드가 있으면 쿠키가 설정되기까지 약간의 지연 후 로드
      setTimeout(() => {
        loadUserInfo(false).then(() => {
          const redirectTo = localStorage.getItem('redirectAfterLogin') || '/';
          window.location.replace(redirectTo);
          localStorage.removeItem('redirectAfterLogin');
        });
      }, 2000); // 2초로 증가
      window.history.replaceState({}, document.title, cleanUrl);
    } else {
      loadUserInfo();
    }

    // 인증 코드 처리 후 리디렉션 처리
    if (hasAuthCode) {
      // 인증 코드 제거를 위한 URL 정리 (필요시)
      const currentUrl = window.location.href;
      const baseUrl = currentUrl.split('?')[0];
      const cleanUrl = baseUrl;

      // 브라우저 히스토리 교체 (뒤로가기 시 코드 노출 방지)
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // 로그인 함수 - 카카오 로그인 페이지로 리다이렉트
  const login = () => {
    console.log('카카오 로그인 시작...');
    const kakaoLoginPath = '/oauth2/authorization/kakao';
    console.log('로그인 URL (상대 경로):', kakaoLoginPath);
    window.location.href = kakaoLoginPath;
  };

  // 로그아웃 함수
  const logout = async () => {
    try {
      console.log('로그아웃 요청 시작...');

      // 로컬 상태 초기화
      setUser(null);

      // 서버에 로그아웃 요청
      await api.post(API_ENDPOINTS.LOGOUT);
      console.log('로그아웃 성공');
    } catch (err) {
      // 에러가 발생해도 로컬에서 로그아웃 처리는 완료됨
      console.error('서버 로그아웃 요청 실패:', err);
      console.log('로컬 로그아웃은 성공적으로 처리됨');
    } finally {
      // 항상 로그인 페이지로 리다이렉트
      console.log('로그인 페이지로 리다이렉트');
      window.location.href = '/login';
    }
  };

  // 회원탈퇴 함수 추가
  const withdraw = async () => {
    try {
      console.log('회원탈퇴 요청 시작...');

      // 서버에 회원탈퇴 요청
      await api.delete(API_ENDPOINTS.WITHDRAW);

      // 로컬 상태 초기화
      setUser(null);
      console.log('회원탈퇴 성공');

      // 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    } catch (err) {
      console.error('회원탈퇴 요청 실패:', err);
      throw err; // 에러를 상위 컴포넌트에서 처리하도록 전파
    }
  };

  // 사용자 정보 업데이트
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  // 인증 상태가 변경될 때마다 로깅
  useEffect(() => {
    console.log('인증 상태 변경:', {
      isAuthenticated: !!user,
      loading,
      hasUser: !!user,
      userData: user,
    });
  }, [user, loading]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        withdraw,
        isAuthenticated: !!user,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
