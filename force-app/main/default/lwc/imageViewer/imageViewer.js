import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { deleteRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getImageFiles from '@salesforce/apex/ImageViewerController.getImageFiles';

export default class ImageViewer extends LightningElement {
    @api recordId;
    @api columns = 4;
    @api hideAddButton = false;
    @api hideDeleteButton = false;

    _wiredResult;
    files = [];
    selectedFileId = null;
    lightboxFile = null;
    error;
    isLoading = true;
    showUpload = false;
    showDeleteConfirm = false;
    isRefreshing = false;

    @wire(getImageFiles, { recordId: '$recordId' })
    wiredFiles(result) {
        this._wiredResult = result;
        this.isLoading = false;
        this.isRefreshing = false;
        const { error, data } = result;
        if (data) {
            this.files = data.map(f => ({
                id: f.Id,
                contentDocumentId: f.ContentDocumentId,
                title: f.Title,
                previewUrl: `/sfc/servlet.shepherd/version/renditionDownload?rendition=THUMB720BY480&versionId=${f.Id}&operationContext=CHATTER`,
                fullUrl: `/sfc/servlet.shepherd/version/download/${f.Id}?operationContext=CHATTER`
            }));
            if (this.selectedFileId && !this.files.some(f => f.id === this.selectedFileId)) {
                this.selectedFileId = null;
            }
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.files = [];
        }
    }

    _doRefresh() {
        this.files = [];
        this.isLoading = true;
        this.isRefreshing = true;
        refreshApex(this._wiredResult);
    }

    get computedFiles() {
        return this.files.map(f => ({
            ...f,
            tileClass: `tile${f.id === this.selectedFileId ? ' tile--selected' : ''}`
        }));
    }

    get numColumns() {
        return parseInt(this.columns, 10) || 4;
    }

    get containerStyle() {
        return `--columns: ${this.numColumns};`;
    }

    get hasFiles() {
        return this.files.length > 0;
    }

    get hasError() {
        return !!this.error;
    }

    get noSelection() {
        return !this.selectedFileId;
    }

    get showAddButton() {
        return !this.hideAddButton;
    }

    get showDeleteButton() {
        return !this.hideDeleteButton;
    }

    get acceptedFormats() {
        return ['.jpg', '.jpeg', '.png', '.gif'];
    }

    get deleteConfirmMessage() {
        if (!this.selectedFileId) return '';
        const file = this.files.find(f => f.id === this.selectedFileId);
        return file ? `「${file.title}」を削除しますか？` : '';
    }

    handleRefresh() {
        this.lightboxFile = null;
        this.selectedFileId = null;
        this._doRefresh();
    }

    handleAdd() {
        this.showUpload = !this.showUpload;
    }

    handleCloseUpload() {
        this.showUpload = false;
    }

    handleUploadFinished() {
        this.showUpload = false;
        this._doRefresh();
    }

    handleDelete() {
        if (!this.selectedFileId) return;
        this.showDeleteConfirm = true;
    }

    handleCancelDelete() {
        this.showDeleteConfirm = false;
    }

    handleBackdropClick(event) {
        if (event.target === event.currentTarget) {
            this.showDeleteConfirm = false;
        }
    }

    async handleConfirmDelete() {
        const file = this.files.find(f => f.id === this.selectedFileId);
        if (!file) return;
        try {
            await deleteRecord(file.contentDocumentId);
            this.lightboxFile = null;
            this.selectedFileId = null;
            this.showDeleteConfirm = false;
            this._doRefresh();
        } catch (err) {
            this.showDeleteConfirm = false;
            this.dispatchEvent(new ShowToastEvent({
                title: '削除エラー',
                message: err?.body?.message ?? '削除に失敗しました',
                variant: 'error'
            }));
        }
    }

    handleTileClick(event) {
        const fileId = event.currentTarget.dataset.id;
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;
        this.selectedFileId = fileId;
        this.lightboxFile = file;
    }

    handleTileKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleTileClick(event);
        }
    }

    handleLightboxClose() {
        this.lightboxFile = null;
    }

    handleKeydown(event) {
        if (event.key === 'Escape') {
            if (this.lightboxFile) {
                this.lightboxFile = null;
            } else if (this.showDeleteConfirm) {
                this.showDeleteConfirm = false;
            } else if (this.showUpload) {
                this.showUpload = false;
            }
        }
    }
}
