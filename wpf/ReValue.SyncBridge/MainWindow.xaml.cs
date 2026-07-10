using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using ReValue.SyncBridge.Models;
using ReValue.SyncBridge.Services;
using ReValue.SyncBridge.Services.BrokerClients;

namespace ReValue.SyncBridge;

public partial class MainWindow : Window
{
    private readonly CredentialManagerStore _credentialStore = new();
    private readonly BridgeCallbackClient _callbackClient = new();
    private readonly ObservableCollection<HoldingPayload> _holdings = [];
    private readonly ObservableCollection<LogLine> _logs = [];
    private readonly SyncLaunchRequest? _launchRequest;
    private CancellationTokenSource? _syncCancellation;
    private bool _loaded;

    public MainWindow(SyncLaunchRequest? launchRequest = null)
    {
        _launchRequest = launchRequest;
        InitializeComponent();
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        _loaded = true;
        BrokerCombo.ItemsSource = BrokerInfo.All;
        BrokerCombo.SelectedValue = BrokerInfo.Find(_launchRequest?.Broker).Id;
        HoldingsGrid.ItemsSource = _holdings;
        LogList.ItemsSource = _logs;
        ToastBorder.Visibility = Visibility.Collapsed;
        SetStatus("고정됨");

        if (_launchRequest is null)
        {
            RequestIdText.Text = "웹에서 'Sync Bridge 실행'을 누르면 요청 ID가 전달됩니다.";
            CallbackUrlText.Text = "";
            EndpointText.Text = "웹 요청 대기 중";
            AddLog("웹에서 요청 수신");
            AddLog("응용프로그램 실행");
        }
        else
        {
            RequestIdText.Text = $"요청 ID: {_launchRequest.RequestId}";
            CallbackUrlText.Text = _launchRequest.CallbackUrl.ToString();
            EndpointText.Text = _launchRequest.CallbackUrl.Host;
            AddLog("웹에서 요청 수신");
            AddLog("응용프로그램 실행");
        }

        LoadCredentialForSelectedBroker();

        if (_launchRequest is not null)
        {
            await Task.Delay(350);
            await BeginSyncAsync();
        }
    }

    private void BrokerCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (!_loaded) return;
        LoadCredentialForSelectedBroker();
    }

    private void RegisterScheme_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var registeredPath = ProtocolRegistrar.RegisterCurrentUser();
            AddLog($"revalue:// 등록 완료");
            CallbackUrlText.Text = registeredPath;
            SetStatus("연결됨");
        }
        catch (Exception ex)
        {
            AddLog($"URL scheme 등록 실패: {ex.Message}");
            MessageBox.Show(ex.Message, "등록 실패", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void SaveCredentials_Click(object sender, RoutedEventArgs e)
    {
        var brokerId = GetSelectedBrokerId();
        var existing = _credentialStore.Read(brokerId);
        var appKey = AppKeyBox.Text.Trim();
        var appSecret = AppSecretBox.Password.Trim();
        var accountNo = AccountNoBox.Text.Trim();

        if (string.IsNullOrWhiteSpace(appKey) || string.IsNullOrWhiteSpace(accountNo))
        {
            MessageBox.Show("API Key와 계좌번호를 입력해 주세요.", "입력 필요", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        if (string.IsNullOrWhiteSpace(appSecret))
        {
            appSecret = existing?.AppSecret ?? "";
        }

        if (string.IsNullOrWhiteSpace(appSecret))
        {
            MessageBox.Show("Secret Key를 입력해 주세요.", "입력 필요", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        _credentialStore.Save(new BrokerCredential(brokerId, appKey, appSecret, accountNo));
        AddLog("인증 완료");
        LoadCredentialForSelectedBroker();
    }

    private void DeleteCredentials_Click(object sender, RoutedEventArgs e)
    {
        var brokerId = GetSelectedBrokerId();
        _credentialStore.Delete(brokerId);
        AppKeyBox.Text = "";
        AppSecretBox.Password = "";
        AccountNoBox.Text = "";
        CredentialStatusText.Text = "미등록";
        SecretHintText.Text = "";
        AddLog($"{BrokerInfo.Find(brokerId).Name} 저장 키를 삭제했습니다.");
    }

    private async void SyncButton_Click(object sender, RoutedEventArgs e)
    {
        await BeginSyncAsync();
    }

    private async Task BeginSyncAsync()
    {
        _syncCancellation?.Cancel();
        _syncCancellation = new CancellationTokenSource();
        var cancellationToken = _syncCancellation.Token;
        var brokerId = GetSelectedBrokerId();
        var demoMode = DemoModeBox.IsChecked == true;
        var credential = _credentialStore.Read(brokerId)
            ?? new BrokerCredential(brokerId, AppKeyBox.Text.Trim(), AppSecretBox.Password.Trim(), AccountNoBox.Text.Trim());

        if (!demoMode && (string.IsNullOrWhiteSpace(credential.AppKey) || string.IsNullOrWhiteSpace(credential.AppSecret)))
        {
            MessageBox.Show("실제 API 모드에서는 저장된 API Key와 Secret이 필요합니다.", "키 필요", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        SetBusy(true);
        SetStatus("동기화 중");
        ApiStatusText.Text = "조회 중";
        ToastBorder.Visibility = Visibility.Collapsed;
        AddLog("증권사 API 조회");

        try
        {
            if (_launchRequest is not null)
            {
                await _callbackClient.SendStartedAsync(_launchRequest, cancellationToken);
            }

            var progress = new Progress<string>(message => AddLog(message));
            var client = BrokerClientFactory.Create(demoMode);
            var holdings = await client.GetHoldingsAsync(credential, progress, cancellationToken);

            _holdings.Clear();
            foreach (var holding in holdings)
            {
                _holdings.Add(holding);
            }

            HoldingCountText.Text = $"총 {_holdings.Count}개 종목";
            LastSyncText.Text = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            AddLog("보유주식 조회 완료");

            if (_launchRequest is not null)
            {
                AddLog("웹 반영 요청 전송");
                await _callbackClient.SendCompletedAsync(
                    _launchRequest,
                    brokerId,
                    MaskAccountNo(credential.AccountNo),
                    holdings,
                    cancellationToken);
                AddLog("웹 DB 반영 완료");
            }
            else
            {
                AddLog("웹 요청 정보가 없어 로컬 미리보기만 갱신했습니다.");
            }

            ApiStatusText.Text = "정상";
            ToastBorder.Visibility = Visibility.Visible;
            SetStatus("동기화 완료");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            ApiStatusText.Text = "오류";
            SetStatus("동기화 실패");
            AddLog($"동기화 실패: {ex.Message}");

            if (_launchRequest is not null)
            {
                try
                {
                    await _callbackClient.SendFailedAsync(_launchRequest, ex.Message, CancellationToken.None);
                }
                catch (Exception callbackError)
                {
                    AddLog($"실패 상태 전송도 실패했습니다: {callbackError.Message}");
                }
            }
        }
        finally
        {
            SetBusy(false);
        }
    }

    private void LoadCredentialForSelectedBroker()
    {
        var brokerId = GetSelectedBrokerId();
        var credential = _credentialStore.Read(brokerId);

        if (credential is null)
        {
            AppKeyBox.Text = "";
            AppSecretBox.Password = "";
            AccountNoBox.Text = "123-456-7890";
            CredentialStatusText.Text = "완료";
            SecretHintText.Text = "데모 모드";
            return;
        }

        AppKeyBox.Text = credential.AppKey;
        AppSecretBox.Password = "";
        AccountNoBox.Text = credential.AccountNo;
        CredentialStatusText.Text = "완료";
        SecretHintText.Text = "Secret 저장됨";
    }

    private string GetSelectedBrokerId()
    {
        return (BrokerCombo.SelectedValue as string) ?? BrokerInfo.All[0].Id;
    }

    private void AddLog(string message)
    {
        _logs.Insert(0, new LogLine(DateTime.Now, message));
    }

    private void SetBusy(bool busy)
    {
        SyncButton.IsEnabled = !busy;
        SaveCredentialButton.IsEnabled = !busy;
        RegisterSchemeButton.IsEnabled = !busy;
    }

    private void SetStatus(string message)
    {
        StatusText.Text = message;

        if (message.Contains("실패", StringComparison.Ordinal))
        {
            StatusBadge.Background = new SolidColorBrush(Color.FromRgb(254, 242, 242));
            StatusText.Foreground = new SolidColorBrush(Color.FromRgb(185, 28, 28));
            return;
        }

        var running = message.Contains("중", StringComparison.Ordinal);
        StatusBadge.Background = running
            ? new SolidColorBrush(Color.FromRgb(239, 246, 255))
            : new SolidColorBrush(Color.FromRgb(234, 248, 239));
        StatusText.Foreground = running
            ? new SolidColorBrush(Color.FromRgb(29, 78, 216))
            : new SolidColorBrush(Color.FromRgb(21, 128, 61));
    }

    private void TitleBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ClickCount == 2)
        {
            ToggleWindowState();
            return;
        }

        DragMove();
    }

    private void MinimizeButton_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void MaximizeButton_Click(object sender, RoutedEventArgs e)
    {
        ToggleWindowState();
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void ToastClose_Click(object sender, RoutedEventArgs e)
    {
        ToastBorder.Visibility = Visibility.Collapsed;
    }

    private void ToggleWindowState()
    {
        WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
    }

    private static string? MaskAccountNo(string? accountNo)
    {
        var raw = new string((accountNo ?? "").Where(char.IsLetterOrDigit).ToArray());
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return $"**{raw.Substring(Math.Max(0, raw.Length - 4))}";
    }
}
