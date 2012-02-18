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
        QVariantMap mapFields = map.value("fields").toMap();

        foreach( const QVariant field, mapFields ) {
            QString key = mapFields.key(field);
            if ((key != "pref") && (key != "type") && (key != "formatted")) {
                QContactDetailFilter subFilter;
                subFilter.setDetailDefinitionName(map.value("name").toString(), field.toString());
                subFilter.setValue(filter);
                subFilter.setMatchFlags(QContactFilter::MatchContains);
                detailFilter.append(subFilter);
            }
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
            QVariantList contactFieldList;
            QString contactField;
            QString mapName = map.value("name").toString();
            QVariantMap mapFields = map.value("fields").toMap();

            QList<QContactDetail> details = currentContact.details(mapName);

            foreach( const QContactDetail detail, details ) {
                if (mapFields.count() == 1) {
                    contactField = detail.variantValue(mapFields.values().at(0).toString()).toString();
                } else {
                    QVariantMap contactFieldMap;
                    foreach( const QVariant field, mapFields ) {
                        contactFieldMap.insert(mapFields.key(field), detail.variantValue(field.toString()).toString());
                    }
                    if (mapFields.value("formatted").isValid()) {
                        QStringList formatted;

                        foreach( QVariant formatField, mapFields.value("formatted").toList() ) {
                            formatted.append(contactFieldMap.value(formatField.toString()).toString());
                        }

                        contactFieldMap.insert("formatted", formatted.join(map.value("formatSeparator").toString()).trimmed());
                    }
                    contactFieldList.append(contactFieldMap);
                }
            }

            QString currentField = fields.key(current);
            if (contactFieldList.length() != 0) {
                if (mapFields.count() != 1)
                    if (map.value("array").toBool())
                        contactMap.insert(currentField, contactFieldList);
                    else
                        contactMap.insert(currentField, contactFieldList.first());
                else
                    contactMap.insert(mapName, contactField);
            } else
                contactMap.insert(currentField, "");
        }

        resultList.append(contactMap);
        if (!multiple && count == 1)
            break;
    }

    return resultList;
}

void Contacts::contactFetchRequestStateChanged(QContactAbstractRequest::State newState) {

}
