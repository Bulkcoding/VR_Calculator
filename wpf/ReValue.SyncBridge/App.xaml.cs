using System.Windows;
using ReValue.SyncBridge.Services;

namespace ReValue.SyncBridge;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var deepLinkArg = e.Args.FirstOrDefault(arg =>
            arg.StartsWith("revalue://", StringComparison.OrdinalIgnoreCase));
        var launchRequest = DeepLinkParser.TryParse(deepLinkArg);

        var mainWindow = new MainWindow(launchRequest);
        MainWindow = mainWindow;
        mainWindow.Show();
    }
}
