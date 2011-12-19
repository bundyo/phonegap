#include "main.h"
#include "mainwindow.h"

#include <QDir>
#include <QGraphicsWebView>

MainWindow *mainWindow;

bool qt_sendSpontaneousEvent(QObject *receiver, QEvent *event) {

    return QCoreApplication::sendSpontaneousEvent(receiver, event);
}

int main(int argc, char *argv[]) {

    QApplication app(argc, argv);// = MDeclarativeCache::qApplication(argc, argv);
    app.setApplicationName("PhoneGap");
    app.setApplicationVersion("0.0.1");

    mainWindow = new MainWindow();
    mainWindow->showFullScreen();
    notifier->orientationChangeStarting(portrait);
    return app.exec();
}
