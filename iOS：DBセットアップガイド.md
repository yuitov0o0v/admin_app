Webアプリ（管理者用）で構築した強固なバックエンド基盤を活かしつつ、**iOSアプリ（一般ユーザー用）** を効率よく開発するためのセットアップガイドを作成しました。

**要件のポイント:**

1.  **誰でも登録可能**: 招待チェックをスキップし、通常のサインアップフローを実装。
2.  **USDZ対応**: Web管理画面でアップロードされた `.usdz` ファイルを表示。
3.  **高い再利用性**: 画面ごとにクエリを書くのではなく、**「Repository（またはService）パターン」** を採用してDB操作をクラス化します。

-----

# 📱 iOSアプリ (SwiftUI + Supabase) 実装ガイド

## 1\. ディレクトリ構成の推奨

Webアプリの `lib/api/` と同様に、DB操作を分離・共通化するために以下の構成をお勧めします。

```text
MyApp
├── Models          // DBの型定義 (Webの types/supabase.ts に相当)
├── Services        // DB操作・認証ロジック (Webの lib/api/ に相当)
│   ├── SupabaseManager.swift
│   ├── AuthService.swift
│   └── DataRepository.swift
├── ViewModels      // 画面の状態管理
└── Views           // UI
```

-----

## 2\. モデル定義 (Models)

Webの `types/supabase.ts` と対になるSwiftの構造体です。
`Codable` を使い、DBの `snake_case` をSwiftの `camelCase` に自動変換します。

**`Models/Spot.swift`**

```swift
import Foundation

struct Spot: Codable, Identifiable {
    let id: UUID
    let name: String
    let description: String?
    let address: String
    let latitude: Double
    let longitude: Double
    let imageUrl: String?
    let arModelId: UUID?
    // Webで設定したカテゴリやピンの色なども必要なら追加
    let category: String?
    let pinColor: String?
    let radius: Int?

    // DBのカラム名とSwiftの変数名のマッピング
    enum CodingKeys: String, CodingKey {
        case id, name, description, address, latitude, longitude, category, radius
        case imageUrl = "image_url"
        case arModelId = "ar_model_id"
        case pinColor = "pin_color"
    }
}
```

**`Models/ArModel.swift`**

```swift
import Foundation

struct ArModel: Codable, Identifiable {
    let id: UUID
    let modelName: String
    let fileUrl: String
    let thumbnailUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case modelName = "model_name"
        case fileUrl = "file_url"
        case thumbnailUrl = "thumbnail_url"
    }
}
```

-----

## 3\. クライアント初期化 (Services)

**`Services/SupabaseManager.swift`**

```swift
import Foundation
import Supabase

class SupabaseManager {
    static let shared = SupabaseManager()
    
    let client = SupabaseClient(
        supabaseURL: URL(string: "https://YOUR_PROJECT.supabase.co")!,
        supabaseKey: "YOUR_ANON_KEY"
    )
    
    private init() {}
}
```

-----

## 4\. 認証サービス (Services)

要件通り\*\*「誰でも登録可能」\*\*な実装にします。Webアプリにあった `checkInvitation` は呼び出しません。

**`Services/AuthService.swift`**

```swift
import Foundation
import Supabase

class AuthService {
    static let shared = AuthService()
    private let client = SupabaseManager.shared.client
    
    // ログイン状況の確認
    var currentUser: User? {
        return client.auth.currentUser
    }
    
    // サインアップ (招待不要、誰でもOK)
    func signUp(email: String, password: String) async throws {
        // user_metadata に初期情報（名前など）を入れることも可能
        try await client.auth.signUp(
            email: email, 
            password: password
        )
    }
    
    // ログイン
    func signIn(email: String, password: String) async throws {
        try await client.auth.signIn(email: email, password: password)
    }
    
    // ログアウト
    func signOut() async throws {
        try await client.auth.signOut()
    }
}
```

-----

## 5\. データ操作リポジトリ (Services) ★再利用性の核

Webアプリの `spotsApi` や `visitsApi` に相当する部分です。
ここでクエリを一元管理することで、View側がスッキリします。

**`Services/DataRepository.swift`**

```swift
import Foundation
import Supabase

class DataRepository {
    static let shared = DataRepository()
    private let client = SupabaseManager.shared.client
    
    // MARK: - Spots
    
    /// 有効なスポット全件取得
    func fetchActiveSpots() async throws -> [Spot] {
        let spots: [Spot] = try await client.database
            .from("spots")
            .select()
            .eq("is_active", value: true) // 公開中のみ
            .execute()
            .value
        return spots
    }
    
    // MARK: - AR Models
    
    /// 特定のARモデル情報を取得
    func fetchArModel(id: UUID) async throws -> ArModel {
        let model: ArModel = try await client.database
            .from("ar_model")
            .select()
            .eq("id", value: id)
            .single()
            .execute()
            .value
        return model
    }
    
    // MARK: - Visits (Check-in)
    
    /// チェックイン記録
    func checkIn(spotId: UUID, lat: Double, lng: Double) async throws {
        guard let userId = client.auth.currentUser?.id else {
            throw NSError(domain: "Auth", code: 401, userInfo: [NSLocalizedDescriptionKey: "ログインが必要です"])
        }
        
        struct VisitInsert: Encodable {
            let user_id: UUID
            let spot_id: UUID
            let latitude: Double
            let longitude: Double
        }
        
        let visit = VisitInsert(user_id: userId, spot_id: spotId, latitude: lat, longitude: lng)
        
        try await client.database
            .from("spot_visit")
            .insert(visit)
            .execute()
    }
}
```

-----

## 6\. ViewModelでの使用例

Viewから直接Repositoryを呼ぶのではなく、ViewModelを挟むとSwiftUIとの相性が良くなります。

**`ViewModels/MapViewModel.swift`**

```swift
import SwiftUI

@MainActor
class MapViewModel: ObservableObject {
    @Published var spots: [Spot] = []
    @Published var selectedArModel: ArModel?
    @Published var errorMessage: String?
    
    private let repository = DataRepository.shared
    
    func loadSpots() async {
        do {
            self.spots = try await repository.fetchActiveSpots()
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }
    
    // スポット詳細で「ARを見る」ボタンを押した時の処理
    func loadArContent(for spot: Spot) async {
        guard let modelId = spot.arModelId else { return }
        do {
            let model = try await repository.fetchArModel(id: modelId)
            
            // iOSは .usdz しか表示できないため、拡張子チェックを入れると親切
            if model.fileUrl.hasSuffix(".usdz") {
                self.selectedArModel = model
            } else {
                self.errorMessage = "このモデルはiOSに対応していません"
            }
        } catch {
            self.errorMessage = "ARモデルの読み込みに失敗しました"
        }
    }
}
```

-----

## 7\. USDZのAR表示 (QuickLook)

iOSで `.usdz` を表示する最も標準的で簡単な方法は `QLPreviewController` を使うことです。

**`Views/ARQuickLookView.swift`**

```swift
import SwiftUI
import QuickLook

struct ARQuickLookView: UIViewControllerRepresentable {
    let fileUrl: URL // SupabaseのURL (またはローカルにダウンロードしたパス)
    
    // インターネット上のURLを直接渡すと動作が不安定な場合があるため、
    // 実装によっては一度 FileManager でローカルに保存してから渡す処理が必要になります。
    // ここではシンプル化のためURL渡しで記述します。

    func makeUIViewController(context: Context) -> QLPreviewController {
        let controller = QLPreviewController()
        controller.dataSource = context.coordinator
        return controller
    }

    func updateUIViewController(_ uiViewController: QLPreviewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    class Coordinator: NSObject, QLPreviewControllerDataSource {
        let parent: ARQuickLookView
        
        init(parent: ARQuickLookView) {
            self.parent = parent
        }
        
        func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
            1
        }
        
        func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
            // タイトルなどをカスタマイズしたい場合は ARQuickLookPreviewItem を使用
            return parent.fileUrl as QLPreviewItem
        }
    }
}
```

### まとめ：iOSアプリ開発の流れ

1.  **AuthService**: 招待チェックなしで `signUp` を実装。
2.  **DataRepository**: Webアプリの `api` フォルダのロジックをここに移植。
3.  **Models**: Webの型定義をSwift `struct` に変換。
4.  **UI**:
      * Map画面で `repository.fetchActiveSpots()` を呼ぶ。
      * 詳細画面でARボタンを押し、`repository.fetchArModel()` でURLを取得。
      * 取得したURLが `.usdz` であれば `ARQuickLookView` を起動してAR体験開始。

これでWeb管理画面とシームレスに連動したiOSアプリが開発可能です！