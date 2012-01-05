#include "contacts.h"
#include <QDebug>
#include <QContactName>
#include <QContactDetail>
#include <QContactAddress>
#include <QContactPhoneNumber>
#include <QContactEmailAddress>
#include <QContactIntersectionFilter>
#include <QContactUnionFilter>
#include <QContactDetailFilter>

Contacts::Contacts(QObject *parent) :
    QObject(parent),
    m_contactFetchRequest() {

    m_contacts = new QContactManager(this);

//    connect(m_contactFetchRequest, SIGNAL(stateChanged(QContactAbstractRequest::State)), this, SLOT(contactFetchRequestStateChanged(QContactAbstractRequest::State)));

//    m_contactFetchRequest.setManager(m_contacts);

}

QVariantMap Contacts::findContacts(QVariantMap fields, QString filter, bool multiple) const {

    QVariantMap keys;
    QContactUnionFilter currentFilter = QContactUnionFilter();

    foreach( const QVariant current, fields ) {
        QContactUnionFilter detailFilter;
        QVariantMap map = current.toMap();

        keys.insert(map.value("name").toString(), fields.key(current));

        foreach( const QVariant field, map.value("fields").toList() ) {
            QContactDetailFilter subFilter;
            subFilter.setDetailDefinitionName(map.value("name").toString(), field.toString());
            subFilter.setValue(filter);
            subFilter.setMatchFlags(QContactFilter::MatchContains);
            detailFilter.append(subFilter);
        }
        currentFilter.append(detailFilter);
    }

    QList<QContact> result = m_contacts->contacts(currentFilter);

    qDebug() << keys;

    QVariantList map;

//    foreach( const QContact currentContact, result ) {
//        foreach( const QString field, keys ) {
//            field.
//        }
//    }

    return map;
}

void Contacts::contactFetchRequestStateChanged(QContactAbstractRequest::State newState) {

}
