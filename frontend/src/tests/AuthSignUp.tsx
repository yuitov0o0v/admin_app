import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

// AuthContextの型定義（実際のプロジェクトに合わせて調整）
interface User {
  id: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  timestamp: string;
  category: 'setup' | 'auth' | 'permission' | 'invitation';
}

const TestComponent: React.FC = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('password123');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTestingState] = useState<boolean>(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'test'>('setup');

  const addTestResult = (
    testName: string, 
    success: boolean, 
    message: string = '', 
    category: TestResult['category'] = 'setup'
  ): void => {
    const result: TestResult = {
      testName,
      success,
      message,
      timestamp: new Date().toLocaleTimeString('ja-JP'),
      category
    };
    setTestResults(prev => [...prev, result]);
  };

  const checkCurrentUserRole = async (): Promise<void> => {
    if (!user) {
      setCurrentUserRole(null);
      return;
    }
    try {
      const { data: profile, error } = await supabase
        .from('user_profile')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setCurrentUserRole(profile.role);
        const roleText = profile.role === 'admin' ? '管理者' : '一般ユーザー';
        addTestResult('ユーザーロール確認', true, `現在のロール: ${roleText}`, 'setup');
      } else {
        setCurrentUserRole(null);
        addTestResult('ユーザーロール確認', false, 'ユーザープロファイルが見つかりません', 'setup');
      }
    } catch (error: any) {
      setCurrentUserRole(null);
      addTestResult('ユーザーロール確認', false, `エラー: ${error.message}`, 'setup');
    }
  };

  const promoteCurrentUserToAdmin = async (): Promise<void> => {
    if (!user) {
      addTestResult('管理者権限付与', false, 'ログインしているユーザーがいません', 'setup');
      return;
    }
    try {
      const { error } = await supabase
        .from('user_profile')
        .update({ role: 'admin' })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setCurrentUserRole('admin');
      addTestResult('管理者権限付与', true, '現在のユーザーを管理者に昇格しました', 'setup');

    } catch (error: any) {
      addTestResult('管理者権限付与', false, `エラー: ${error.message}`, 'setup');
    }
  };

  // --- 修正箇所: エラーハンドリングを強化 ---
  const runUserRegistrationTest = async (
    testEmail: string, 
    testPassword: string, 
    expectedRole: string = 'user'
  ): Promise<void> => {
    const testProcess = async () => {
      // 1. 新規ユーザーを作成
      const signUpResult = await signUp(testEmail, testPassword);
      
      //【修正】signUpの戻り値を安全にチェックする
      // Supabase v2のsignUpは { data: { user, session }, error } を返す
      // AuthContextでラップされている可能性も考慮し、nullチェックを強化
      const newUser = signUpResult?.data?.user;
      const signUpError = signUpResult?.error;

      if (signUpError || !newUser) {
        addTestResult('新規ユーザー登録', false, `登録失敗: ${signUpError?.message || 'ユーザーが作成されませんでした'}`, 'auth');
        return;
      }
      addTestResult('新規ユーザー登録', true, `ユーザー作成成功: ${newUser.id}`, 'auth');
      const newUserId = newUser.id;

      // 2. プロフィール作成をポーリングで確認 (setTimeoutより確実)
      let profile: { role: string } | null = null;
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
        const { data } = await supabase
          .from('user_profile')
          .select('role')
          .eq('user_id', newUserId)
          .single();
        if (data) {
          profile = data;
          break;
        }
      }

      // 3. 結果を検証
      const expectedRoleText = expectedRole === 'admin' ? '管理者' : '一般ユーザー';
      if (profile) {
        const actualRoleText = profile.role === 'admin' ? '管理者' : '一般ユーザー';
        if (profile.role === expectedRole) {
          addTestResult('自動プロフィール作成', true, `プロフィール作成成功 - ロール: ${actualRoleText}`, 'auth');
        } else {
          addTestResult('自動プロフィール作成', false, `ロールが不正: 期待値=${expectedRoleText}, 実際値=${actualRoleText}`, 'auth');
        }
      } else {
        addTestResult('自動プロフィール作成', false, 'タイムアウト: プロフィールが見つかりませんでした', 'auth');
      }
    };
    
    setIsTestingState(true);
    addTestResult('テスト開始', true, `${testEmail} の登録テストを開始します。`, 'auth');
    try {
      await testProcess();
    } catch (error: any) {
      addTestResult('テスト全体', false, `予期せぬエラー: ${error.message}`, 'auth');
    } finally {
      if (user && user.email) {
          //【注意】テスト用に固定パスワードを使用しています。
           await signIn(user.email, 'password123');
      }
      setIsTestingState(false);
    }
  };

  const testAdminInvitationFlow = async (): Promise<void> => {
    if (!user || currentUserRole !== 'admin') {
      addTestResult('管理者招待テスト', false, '管理者でログインしてください', 'invitation');
      return;
    }
    
    const invitedEmail = `invited-admin-${Date.now()}@test.com`;
    const invitedPassword = 'password123';

    setIsTestingState(true);

    try {
      addTestResult('管理者権限確認', true, `現在の管理者: ${user.email}`, 'invitation');
      
      const { data: inviteResult, error: inviteError } = await supabase.rpc('invite_admin', {
        email_to_invite: invitedEmail
      });

      if (inviteError) throw new Error(`RPC関数エラー: ${inviteError.message}`);
      
      if (inviteResult?.success) {
        addTestResult('管理者招待送信', true, `招待送信成功: ${invitedEmail}`, 'invitation');
        await runUserRegistrationTest(invitedEmail, invitedPassword, 'admin');
      } else {
        addTestResult('管理者招待送信', false, `招待失敗: ${inviteResult?.message || '不明なエラー'}`, 'invitation');
      }
    } catch (error: any) {
      addTestResult('管理者招待テスト', false, `エラー: ${error.message}`, 'invitation');
    } finally {
        setIsTestingState(false);
    }
  };

  const testPermissions = async (): Promise<void> => {
    if (!user) {
      addTestResult('権限テスト', false, 'ログインしているユーザーがいません', 'permission');
      return;
    }

    try {
      const { error: inviteError } = await supabase
        .rpc('get_invitations');
      
      if (currentUserRole === 'admin') {
        if (inviteError) {
          addTestResult('招待一覧取得', false, `管理者なのに取得失敗: ${inviteError.message}`, 'permission');
        } else {
          addTestResult('招待一覧取得', true, '管理者として招待一覧にアクセスできました', 'permission');
        }
      } else {
        if (inviteError) {
          addTestResult('招待一覧取得', true, '一般ユーザーは招待一覧にアクセスできません（正常）', 'permission');
        } else {
          addTestResult('招待一覧取得', false, '一般ユーザーが招待一覧にアクセスできています（問題）', 'permission');
        }
      }

      const { data: profiles, error: profileError } = await supabase
        .from('user_profile')
        .select('*');

      if (profileError) {
        addTestResult('全プロフィール取得', false, `取得エラー: ${profileError.message}`, 'permission');
      } else if (profiles) {
        if (currentUserRole === 'admin') {
          addTestResult('全プロフィール取得', true, `管理者として全プロフィールを取得: ${profiles.length}件`, 'permission');
        } else {
          if (profiles.length === 1 && profiles[0].user_id === user.id) {
            addTestResult('全プロフィール取得', true, '一般ユーザーは自分のプロフィールのみアクセス可能（正常）', 'permission');
          } else {
            addTestResult('全プロフィール取得', false, `一般ユーザーが${profiles.length}件のプロフィールにアクセス（問題）`, 'permission');
          }
        }
      }
    } catch (error: any) {
      addTestResult('権限テスト', false, `予期しないエラー: ${error.message}`, 'permission');
    }
  };

  const clearResults = (): void => setTestResults([]);

  useEffect(() => {
    if (user) {
      checkCurrentUserRole();
    } else {
      setCurrentUserRole(null);
    }
  }, [user]);

  const getResultsByCategory = (category: TestResult['category']) => 
    testResults.filter(result => result.category === category);

  const getCategoryStats = (category: TestResult['category']) => {
    const results = getResultsByCategory(category);
    return {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };
  };

  // --- UI部分は変更なし ---
  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🛡️ Supabase RBAC テストツール
          </h1>
          <p className="text-gray-600">ロールベースアクセス制御システムの動作確認</p>
        </div>
        
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'setup' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔧 セットアップ・設定
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'test' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🧪 テスト実行
          </button>
        </div>

        {activeTab === 'setup' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-xl font-semibold mb-4 text-blue-800">👤 現在のログイン状態</h2>
              {loading ? (
                <p>読み込み中...</p>
              ) : user ? (
                <div>
                  <p className="font-medium text-green-700">ログイン済み: {user.email}</p>
                  <p className="text-sm text-gray-600">ユーザーID: {user.id}</p>
                  {currentUserRole && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        currentUserRole === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {currentUserRole === 'admin' ? '🛡️ 管理者' : '👤 一般ユーザー'}
                      </span>
                  )}
                </div>
              ) : (
                <p>ログインしていません</p>
              )}
            </div>

            {user && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                <h2 className="text-xl font-semibold mb-4 text-purple-800">⚙️ ロール管理</h2>
                <div className="flex flex-wrap gap-3">
                  <button onClick={checkCurrentUserRole} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">ロール確認</button>
                  {currentUserRole !== 'admin' && (
                    <button onClick={promoteCurrentUserToAdmin} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">管理者に昇格</button>
                  )}
                  <button onClick={testPermissions} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">権限テスト実行</button>
                  <button onClick={signOut} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">ログアウト</button>
                </div>
              </div>
            )}

            {!user && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                <h2 className="text-xl font-semibold mb-4 text-green-800">🔐 手動ログイン・登録</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg"/>
                  <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg"/>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => signIn(email, password)} disabled={!email || !password} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">ログイン</button>
                  <button onClick={() => signUp(email, password)} disabled={!email || !password} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">新規登録</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'test' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-3 text-blue-800">🔄 基本機能テスト</h3>
                <button onClick={() => runUserRegistrationTest(`testuser-${Date.now()}@example.com`, 'password123')} disabled={isTesting} className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">一般ユーザー登録テスト</button>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-lg border border-purple-200">
                 <h3 className="text-lg font-semibold mb-3 text-purple-800">👑 管理者機能テスト</h3>
                 <button onClick={testAdminInvitationFlow} disabled={isTesting || !user || currentUserRole !== 'admin'} className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">管理者招待フローテスト</button>
                 {(!user || currentUserRole !== 'admin') && <p className="text-sm text-red-600 mt-2">⚠️ 管理者でログインしてください</p>}
              </div>
            </div>

            {testResults.length > 0 && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">📊 テスト結果サマリー</h3>
                      <button onClick={clearResults} className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">クリア</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(['setup', 'auth', 'permission', 'invitation'] as const).map(category => {
                          const stats = getCategoryStats(category);
                          if(stats.total === 0) return null;
                          return (
                              <div key={category} className="bg-gray-50 p-3 rounded">
                                  <p className="font-medium text-gray-700">{category.charAt(0).toUpperCase() + category.slice(1)}</p>
                                  <span className="text-green-600">✅ {stats.passed}</span> | <span className="text-red-600">❌ {stats.failed}</span>
                              </div>
                          );
                      })}
                  </div>
              </div>
            )}
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">📋 詳細テスト結果</h3>
              {testResults.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${result.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                      <div className="flex justify-between">
                        <div>
                          <span className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>{result.success ? '✅ PASS' : '❌ FAIL'}: {result.testName}</span>
                          <p className={`text-sm mt-1 ${result.success ? 'text-green-600' : 'text-red-600'}`}>{result.message}</p>
                        </div>
                        <span className="text-xs text-gray-500">{result.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">まだテストが実行されていません</p>
              )}
            </div>
          </div>
        )}

        {isTesting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="text-lg font-medium">テスト実行中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestComponent;