#include "deviceinfo.h"
#include "stdio.h"
#include <QSystemDeviceInfo>
#include <QNetworkConfigurationManager>

using namespace QtMobility;

DeviceInfo::DeviceInfo(QObject *parent) :
    QObject(parent) {

    QSystemInfo info;
    QSystemDeviceInfo deviceInfo;

    m_name = deviceInfo.model();
    m_platform = "MeeGo Harmattan";
    m_uuid = deviceInfo.uniqueDeviceID();
    m_version = info.version ( QSystemInfo::Os );
}

const QString &DeviceInfo::name() const {

    return m_name;
}

const QString &DeviceInfo::platform() const {

    return m_platform;
}

const QString &DeviceInfo::uuid() const {

    return m_uuid;
}

const QString &DeviceInfo::version() const {

    return m_version;
}

const QString &DeviceInfo::network() const {

    QNetworkConfigurationManager manager;
    QSystemNetworkInfo* networkInfo = new QSystemNetworkInfo();
    QSystemNetworkInfo::NetworkMode networkMode = networkInfo->currentMode();
    qDebug() << ""; // WTF! Remove this and get a segfault.

    if (!manager.isOnline()) // Seems there is no reliable way to detect if a 3G data connection is active, so ruling it out early.
        return "none";

    switch (networkMode) {
        case QSystemNetworkInfo::BluetoothMode:
            return "bluetooth";
        case QSystemNetworkInfo::WlanMode:
            return "wifi";
        case QSystemNetworkInfo::EthernetMode:
            return "ethernet";
        case QSystemNetworkInfo::WimaxMode:
        case QSystemNetworkInfo::LteMode:
            return "4g";
        case QSystemNetworkInfo::UnknownMode:
            return "unknown";
        default:
            QSystemNetworkInfo::CellDataTechnology cell = networkInfo->cellDataTechnology();
            switch (cell) {
                case QSystemNetworkInfo::GprsDataTechnology:
                case QSystemNetworkInfo::EdgeDataTechnology:
                    return "2g";
                case QSystemNetworkInfo::UmtsDataTechnology:
                case QSystemNetworkInfo::HspaDataTechnology:
                    return "3g";
            }
    }

    return "unknown";
}


