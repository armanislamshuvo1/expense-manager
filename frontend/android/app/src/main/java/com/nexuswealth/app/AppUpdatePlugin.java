package com.nexuswealth.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ret.put("value", getContext().getPackageManager().canRequestPackageInstalls());
        } else {
            ret.put("value", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse(String.format("package:%s", getContext().getPackageName())));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String downloadUrl = call.getString("url");
        if (downloadUrl == null || downloadUrl.isEmpty()) {
            call.reject("Download URL is required");
            return;
        }

        new Thread(() -> {
            try {
                URL url = new URL(downloadUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("User-Agent", "NexusWealth-Updater");
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(60000);
                conn.connect();

                // Follow up to 3 redirects if needed
                int redirectCount = 0;
                while (redirectCount < 3 && (conn.getResponseCode() == HttpURLConnection.HTTP_MOVED_TEMP ||
                       conn.getResponseCode() == HttpURLConnection.HTTP_MOVED_PERM ||
                       conn.getResponseCode() == 307 ||
                       conn.getResponseCode() == 308)) {
                    String newUrl = conn.getHeaderField("Location");
                    if (newUrl == null) break;
                    conn = (HttpURLConnection) new URL(newUrl).openConnection();
                    conn.setRequestProperty("User-Agent", "NexusWealth-Updater");
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(60000);
                    conn.connect();
                    redirectCount++;
                }

                int fileLength = conn.getContentLength();
                InputStream input = conn.getInputStream();

                File cacheDir = getContext().getExternalCacheDir();
                if (cacheDir == null) {
                    cacheDir = getContext().getCacheDir();
                }

                File apkFile = new File(cacheDir, "NexusWealth-update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                FileOutputStream output = new FileOutputStream(apkFile);

                byte[] data = new byte[8192];
                long total = 0;
                int count;
                long lastNotifyTime = 0;

                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);

                    long now = System.currentTimeMillis();
                    if (fileLength > 0 && now - lastNotifyTime > 200) {
                        lastNotifyTime = now;
                        int percent = (int) ((total * 100) / fileLength);
                        JSObject progress = new JSObject();
                        progress.put("percent", Math.min(percent, 99));
                        progress.put("bytesDownloaded", total);
                        progress.put("totalBytes", fileLength);
                        notifyListeners("downloadProgress", progress);
                    }
                }

                output.flush();
                output.close();
                input.close();

                // Notify 100% completion
                JSObject progress = new JSObject();
                progress.put("percent", 100);
                progress.put("bytesDownloaded", total);
                progress.put("totalBytes", total);
                notifyListeners("downloadProgress", progress);

                // Prompt settings if package install permission not yet granted
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (!getContext().getPackageManager().canRequestPackageInstalls()) {
                        Intent reqIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                        reqIntent.setData(Uri.parse(String.format("package:%s", getContext().getPackageName())));
                        reqIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getContext().startActivity(reqIntent);
                    }
                }

                // Fire package installer intent via FileProvider
                Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apkFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(installIntent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);

            } catch (Exception e) {
                call.reject("Update failed: " + e.getMessage(), e);
            }
        }).start();
    }
}
