#include "main.h"
#include "mainwindow.h"
#include "notification.h"
#include "qglobal.h"

#include <QDebug>
#include <QMessageBox>
#include <QtDeclarative>
#include <QFeedbackHapticsEffect>

QTM_USE_NAMESPACE

Notification::Notification(QObject *parent) :
    QObject(parent) {

}

void Notification::beep(int times) {
    for (int i = 0; i < times; i++) {
        app.beep();
    }
}

void Notification::vibrate(int duration, int intensity) {
    QFeedbackHapticsEffect *haptic = new QFeedbackHapticsEffect();

    haptic->setAttackIntensity(0.0);
    haptic->setAttackTime(100);
    haptic->setIntensity(intensity);
    haptic->setDuration(duration);
    haptic->setFadeTime(100);
    haptic->setFadeIntensity(0.0);
    haptic->start();
}

void Notification::alert(QString message, QString title = "Alert", QString buttonName = "Ok") {
    if (QMLDialog) {
        QMLDialog->setProperty( "titleText", title );
        QMLDialog->setProperty( "contentText", message );
        QMLDialog->setProperty( "button1Visible", true );
        QMLDialog->setProperty( "button1Text", buttonName );
        QMLDialog->setProperty( "button2Visible", false );
        QMetaObject::invokeMethod(QMLDialog, "open");
    }
}

void Notification::confirm(QString message, QString title = "Confirm", QString buttonNames = "Ok,Cancel") {
    if (QMLDialog) {
        QStringList names = buttonNames.split(",");
        QMLDialog->setProperty( "titleText", title );
        QMLDialog->setProperty( "contentText", message );
        QMLDialog->setProperty( "button1Visible", true );
        QMLDialog->setProperty( "button1Text", names[0] );
        QMLDialog->setProperty( "button2Visible", true );
        QMLDialog->setProperty( "button2Text", names[1] );
        QMetaObject::invokeMethod(QMLDialog, "open");
    }
}
