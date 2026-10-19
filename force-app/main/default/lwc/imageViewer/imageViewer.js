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
    sortField = 'title';
    sortOrder = 'asc';

    @wire(getImageFiles, { recordId: '$recordId' })
    wiredFiles(result) {
        this._wiredResult = result;
        this.isLoading = false;
        this.isRefreshing = false;
        const { error, data } = result;
        if (data) {
            this.files = this._mapData(data);
            if (this.selectedFileId && !this.files.some(f => f.id === this.selectedFileId)) {
                this.selectedFileId = null;
            }
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.files = [];
        }
    }

    _mapData(data) {
        return data.map(f => ({
            id: f.Id,
            contentDocumentId: f.ContentDocumentId,
            title: f.Title,
            createdDate: f.CreatedDate,
            previewUrl: `/sfc/servlet.shepherd/version/renditionDownload?rendition=THUMB720BY480&versionId=${f.Id}&operationContext=CHATTER`,
            fullUrl: `/sfc/servlet.shepherd/version/download/${f.Id}?operationContext=CHATTER`
        }));
    }

    async _doRefresh() {
        this.files = [];
        this.isLoading = true;
        this.isRefreshing = true;
        try {
            await refreshApex(this._wiredResult);
            // refreshApex resolves without calling the wire handler when data is unchanged.
            // In that case restore files from the cached result.
            if (this.files.length === 0 && this._wiredResult?.data?.length > 0) {
                this.files = this._mapData(this._wiredResult.data);
            }
        } catch (err) {
            this.error = err;
            this.files = [];
        } finally {
            this.isLoading = false;
            this.isRefreshing = false;
        }
    }

    get computedFiles() {
        const fmt = new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
        const sorted = [...this.files].sort((a, b) => {
            let cmp;
            if (this.sortField === 'title') {
                cmp = a.title.localeCompare(b.title, 'ja');
            } else {
                cmp = new Date(a.createdDate) - new Date(b.createdDate);
            }
            return this.sortOrder === 'asc' ? cmp : -cmp;
        });
        return sorted.map(f => ({
            ...f,
            createdDateFormatted: f.createdDate ? fmt.format(new Date(f.createdDate)) : '',
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

    get sortFieldLabel() {
        return this.sortField === 'title' ? 'タイトル' : '作成日時';
    }

    get sortOrderLabel() {
        return this.sortOrder === 'asc' ? '昇順' : '降順';
    }

    get isSortByTitle() {
        return this.sortField === 'title';
    }

    get isSortByDate() {
        return this.sortField === 'createdDate';
    }

    get isSortAsc() {
        return this.sortOrder === 'asc';
    }

    get isSortDesc() {
        return this.sortOrder === 'desc';
    }

    handleSortFieldChange(event) {
        this.sortField = event.detail.value;
    }

    handleSortOrderChange(event) {
        this.sortOrder = event.detail.value;
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
        const file = this.computedFiles.find(f => f.id === fileId);
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
