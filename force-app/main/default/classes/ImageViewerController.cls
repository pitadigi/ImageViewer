public with sharing class ImageViewerController {

    @AuraEnabled(cacheable=true)
    public static List<ContentVersion> getImageFiles(Id recordId) {
        List<ContentDocumentLink> links = [
            SELECT ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :recordId
            WITH USER_MODE
        ];

        if (links.isEmpty()) {
            return new List<ContentVersion>();
        }

        Set<Id> docIds = new Set<Id>();
        for (ContentDocumentLink link : links) {
            docIds.add(link.ContentDocumentId);
        }

        return [
            SELECT Id, Title, FileExtension, ContentDocumentId
            FROM ContentVersion
            WHERE ContentDocumentId IN :docIds
              AND IsLatest = true
              AND FileExtension IN ('jpg', 'jpeg', 'png', 'gif')
            WITH USER_MODE
            ORDER BY Title
        ];
    }

    @AuraEnabled
    public static void deleteFile(Id contentDocumentId) {
        delete [
            SELECT Id FROM ContentDocument
            WHERE Id = :contentDocumentId
            WITH USER_MODE
        ];
    }
}
