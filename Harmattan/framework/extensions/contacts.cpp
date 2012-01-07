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

QVariantList Contacts::findContacts(QVariantMap fields, QString filter, bool multiple) const {

    QContactUnionFilter currentFilter = QContactUnionFilter();

    foreach( const QVariant current, fields ) {
        QContactUnionFilter detailFilter;
        QVariantMap map = current.toMap();

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

    QVariantList resultList;

    int count = 0;
    foreach( const QContact currentContact, result ) {
        count++;
        QVariantMap contactMap;
        foreach( const QVariant current, fields ) {
            QVariantMap map = current.toMap();
            QStringList contactFieldList;

            QList<QContactDetail> details = currentContact.details(map.value("name").toString());

            foreach( const QContactDetail detail, details ) {
                QString contactField = "";
                foreach( const QVariant field, map.value("fields").toList() ) {
                    contactField += detail.variantValue(field.toString()).toString() + " ";
                }
                contactFieldList.append(contactField.trimmed());
            }

            if (contactFieldList.count() != 0) {
                if (map.value("array").toBool())
                    contactMap.insert(fields.key(current), contactFieldList);
                else
                    contactMap.insert(fields.key(current), contactFieldList.first());
            } else
                contactMap.insert(fields.key(current), "");
        }
        resultList.append(contactMap);
        if (!multiple && count == 1)
            break;
    }

    return resultList;
}

void Contacts::contactFetchRequestStateChanged(QContactAbstractRequest::State newState) {

}
