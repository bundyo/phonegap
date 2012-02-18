#ifndef COMPASS_H
#define COMPASS_H

#include <QCompass>
#include <QObject>

QTM_USE_NAMESPACE


class Compass : public QObject {

    Q_OBJECT

    public:
        explicit Compass(QObject *parent = 0);

        Q_INVOKABLE QVariantMap getCurrentHeading() const;

    protected slots:
        void updateSensor();

    private:
        QCompass *m_compass;

        double m_azymuth;
        double m_calibrationLevel;
};

#endif // COMPASS_H
