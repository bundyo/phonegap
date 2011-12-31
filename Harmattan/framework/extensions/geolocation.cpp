/*
 * Geolocation.cpp
 *
 *  Created on: Nov 24, 2009
 *      Author: nitobi-test
 */

#include "geolocation.h"
#include "mainwindow.h"
#include <QWebFrame>
#include <QDebug>

Geolocation::Geolocation(QObject *parent) :
    QObject(parent),
    m_source(0) {

    m_source = QGeoPositionInfoSource::createDefaultSource(this);
    if (m_source) {
        connect(m_source, SIGNAL(positionUpdated(QGeoPositionInfo)),
                this, SLOT(onPositionUpdated(QGeoPositionInfo)));
        connect(m_source, SIGNAL(updateTimeout()),
                this, SLOT(onUpdateTimeout()));

    } else {
        qWarning("No GeoPosition source available.");
    }
}

void Geolocation::setHighAccuracy(bool highAccuracy) {
    if (highAccuracy)
        m_source->setPreferredPositioningMethods(QGeoPositionInfoSource::SatellitePositioningMethods);
    else
        m_source->setPreferredPositioningMethods(QGeoPositionInfoSource::AllPositioningMethods);
}

QString Geolocation::getPositionFromInfo(const QGeoPositionInfo &info) {

    QVariantMap coords;
    coords["latitude"] = info.coordinate().latitude();
    coords["longitude"] = info.coordinate().longitude();
    coords["altitude"] = info.coordinate().altitude();
    coords["accuracy"] = info.attribute(QGeoPositionInfo::HorizontalAccuracy);
    coords["altitudeAccuracy"] = info.attribute(QGeoPositionInfo::VerticalAccuracy);
    coords["heading"] = info.attribute(QGeoPositionInfo::Direction);
    coords["speed"] = info.attribute(QGeoPositionInfo::GroundSpeed);

    QString coordString = "";
    foreach (QString key, coords.keys()) {
        coordString += "," + key + ":'" + (coords[key].toString() == "nan" ? "" : coords[key].toString()) + "'";
    }

    return "{coords:{" + coordString.mid(1) + "},timestamp:'" + QString::number(QDateTime::currentMSecsSinceEpoch()) + "'}";
}

void Geolocation::getCurrentPosition(uint maximumAge, int timeout, bool enableHighAccuracy) {

    if (maximumAge > 0) {
        QGeoPositionInfo info = m_source->lastKnownPosition(enableHighAccuracy);

        if ( maximumAge <= QDateTime::currentMSecsSinceEpoch() - info.timestamp().toTime_t())
            onPositionUpdated(info);
    }

    setHighAccuracy(enableHighAccuracy);
    m_source->requestUpdate(timeout);
}

void Geolocation::watchPosition(uint maximumAge, int timeout, bool enableHighAccuracy) {

    if (m_source) {
        getCurrentPosition(maximumAge, timeout, enableHighAccuracy);
        m_source->setUpdateInterval(timeout/2);
        m_source->startUpdates();
    } else {
        emitError(2, "The device does not support position location.");
    }
}

void Geolocation::stop() {

    if (m_source) {
        m_source->stopUpdates();
    } else {
        emitError(2, "The device does not support position location.");
    }
}

void Geolocation::emitError(int code, const QString &message) {
    ((QDeclarativeWebView*) QMLWebView)->page()->mainFrame()->evaluateJavaScript("var listeners = navigator._geo.listeners; for (var idx in listeners) { if ('fail' in listeners[idx]) { listeners[idx].fail({ code: '" + ((QString) code) + "', message: '" + message + "' }); }} delete navigator._geo.listeners['global'];" );
}

void Geolocation::onPositionUpdated(const QGeoPositionInfo &info) {
    ((QDeclarativeWebView*) QMLWebView)->page()->mainFrame()->evaluateJavaScript("var listeners = navigator._geo.listeners; for (var idx in listeners) { if ('success' in listeners[idx]) { listeners[idx].success(" + getPositionFromInfo(info) + "); }} delete navigator._geo.listeners['global'];");
}

void Geolocation::onUpdateTimeout() {
    emitError(3, "Timeout occurred.");
}
