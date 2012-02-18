#ifndef CONTACTS_H
#define CONTACTS_H

#include <QContactManager>
#include <QContactAbstractRequest>
#include <QContactFetchRequest>
#include <QObject>

QTM_USE_NAMESPACE

class Contacts : public QObject {

    Q_OBJECT

    public:
        explicit Contacts(QObject *parent = 0);

        Q_INVOKABLE QVariantList findContacts(QVariantMap fields, QString filter, bool multiple = true) const;

    private slots:
        void contactFetchRequestStateChanged(QContactAbstractRequest::State newState);

    private:
        QContactManager *m_contacts;
        QContactFetchRequest m_contactFetchRequest;
};

#endif // CONTACTS_H
