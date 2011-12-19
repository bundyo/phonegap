#include "compass.h"
#include <QDebug>

Compass::Compass(QObject *parent) :
    QObject(parent),
    m_azymuth(0),
    m_calibrationLevel(0) {

    m_compass = new QCompass(this);
    m_compass->connectToBackend();
    m_compass->start();

    connect(m_compass, SIGNAL(readingChanged()), SLOT(updateSensor()));
}

QVariantMap Compass::getCurrentHeading() const {

    QVariantMap map;
    map["azymuth"] = m_azymuth;
    map["calibrationLevel"] = m_calibrationLevel;
    return map;
}

void Compass::updateSensor() {

    QCompassReading *reading = m_compass->reading();
    m_azymuth = reading->azimuth();
    m_calibrationLevel = reading->calibrationLevel();
}
