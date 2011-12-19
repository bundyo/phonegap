#ifndef NOTIFICATION_H
#define NOTIFICATION_H

#include <QObject>

class Notification : public QObject {

    Q_OBJECT

    public:
        explicit Notification(QObject *parent = 0);

    public slots:
        void beep(int times = 1);
        void vibrate(int duration = 1000, int intensity = 50);
        void alert(QString message, QString title, QString buttonName);
        void confirm(QString message, QString title, QString buttonNames);
};

#endif // NOTIFICATION_H
