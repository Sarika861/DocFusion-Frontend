import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-document-merger',
  templateUrl: './document-merger.html',
  styleUrls: ['./document-merger.css']
})
export class DocumentMerger {

  selectedFiles: File[] = [];

  isMerging = false;
  isDragging = false;

  message = '';

  mergedPdfUrl: SafeResourceUrl | null = null;

  private downloadUrl: string | null = null;

  private apiUrl = 'http://127.0.0.1:8000/api/merge-pdfs';

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) { }


  // =========================
  // FILE SELECTION
  // =========================

  onFilesSelected(event: Event): void {

    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const files = Array.from(input.files);

    this.addPdfFiles(files);

    // Allow selecting same file again
    input.value = '';
  }


  private addPdfFiles(files: File[]): void {

    const pdfFiles = files.filter(file =>
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      this.message = 'Please select PDF files only.';
      return;
    }

    this.selectedFiles = [
      ...this.selectedFiles,
      ...pdfFiles
    ];

    this.message =
      `${this.selectedFiles.length} PDF file(s) selected`;
  }


  // =========================
  // DRAG & DROP
  // =========================

  onDragOver(event: DragEvent): void {

    event.preventDefault();
    event.stopPropagation();

    this.isDragging = true;
  }


  onDragLeave(event: DragEvent): void {

    event.preventDefault();
    event.stopPropagation();

    this.isDragging = false;
  }


  onDrop(event: DragEvent): void {

    event.preventDefault();
    event.stopPropagation();

    this.isDragging = false;

    if (!event.dataTransfer?.files) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);

    this.addPdfFiles(files);
  }


  // =========================
  // FILE SIZE
  // =========================

  formatFileSize(bytes: number): string {

    if (bytes === 0) {
      return '0 Bytes';
    }

    const units = [
      'Bytes',
      'KB',
      'MB',
      'GB'
    ];

    const index = Math.floor(
      Math.log(bytes) / Math.log(1024)
    );

    return (
      parseFloat(
        (bytes / Math.pow(1024, index)).toFixed(2)
      ) +
      ' ' +
      units[index]
    );
  }


  // =========================
  // MOVE FILE UP
  // =========================

  moveUp(index: number, event?: Event): void {

    if (event) {
      event.stopPropagation();
    }

    if (index <= 0) {
      return;
    }

    const temp = this.selectedFiles[index];

    this.selectedFiles[index] =
      this.selectedFiles[index - 1];

    this.selectedFiles[index - 1] = temp;
  }


  // =========================
  // MOVE FILE DOWN
  // =========================

  moveDown(index: number, event?: Event): void {

    if (event) {
      event.stopPropagation();
    }

    if (index >= this.selectedFiles.length - 1) {
      return;
    }

    const temp = this.selectedFiles[index];

    this.selectedFiles[index] =
      this.selectedFiles[index + 1];

    this.selectedFiles[index + 1] = temp;
  }


  // =========================
  // REMOVE FILE
  // =========================

  removeFile(index: number, event?: Event): void {

    if (event) {
      event.stopPropagation();
    }

    this.selectedFiles.splice(index, 1);

    this.message =
      `${this.selectedFiles.length} PDF file(s) selected`;
  }


  // =========================
  // CLEAR ALL
  // =========================

  clearAll(): void {

    this.selectedFiles = [];

    this.message = '';

    this.mergedPdfUrl = null;

    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
      this.downloadUrl = null;
    }
  }


  // =========================
  // MERGE DOCUMENTS
  // =========================

  mergeDocuments(): void {

    if (this.selectedFiles.length < 2) {

      this.message =
        'Please select at least 2 PDF files.';

      return;
    }

    this.isMerging = true;

    this.message = 'Merging documents...';

    this.mergedPdfUrl = null;

    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
      this.downloadUrl = null;
    }

    const formData = new FormData();

    this.selectedFiles.forEach(file => {

      formData.append(
        'files',
        file,
        file.name
      );

    });

    console.log(
      'Sending files:',
      this.selectedFiles.map(file => file.name)
    );


    this.http.post(
      this.apiUrl,
      formData,
      {
        responseType: 'blob',
        observe: 'response'
      }
    )
      .subscribe({

        next: (response) => {

          console.log(
            'Response status:',
            response.status
          );

          console.log(
            'Content-Type:',
            response.headers.get('content-type')
          );

          const blob = response.body;

          if (!blob || blob.size === 0) {

            this.isMerging = false;

            this.message =
              'Merged PDF is empty.';

            return;
          }

          console.log(
            'Merged PDF size:',
            this.formatFileSize(blob.size)
          );


          this.downloadUrl =
            URL.createObjectURL(
              new Blob(
                [blob],
                { type: 'application/pdf' }
              )
            );


          this.mergedPdfUrl =
            this.sanitizer.bypassSecurityTrustResourceUrl(
              this.downloadUrl
            );


          this.isMerging = false;

          this.message =
            'Documents merged successfully!';

          console.log(
            'PDF preview ready:',
            this.downloadUrl
          );
        },


        error: (error) => {

          console.error(
            'Merge error:',
            error
          );

          this.isMerging = false;

          this.message =
            'Failed to merge documents.';

          if (error.error instanceof Blob) {

            error.error.text().then(
              (text: string) => {

                console.error(
                  'Backend error:',
                  text
                );

                try {

                  const data =
                    JSON.parse(text);

                  this.message =
                    data.detail ||
                    'Failed to merge PDFs.';

                } catch {

                  // Keep default error message

                }

              }
            );

          }

        }

      });
  }


  // =========================
  // OPEN IN NEW TAB
  // =========================

  openInNewTab(): void {

    if (!this.downloadUrl) {

      this.message =
        'Please merge the PDFs first.';

      return;
    }

    window.open(
      this.downloadUrl,
      '_blank'
    );
  }


  // =========================
  // DOWNLOAD
  // =========================

  downloadMergedPdf(): void {

    if (!this.downloadUrl) {

      this.message =
        'Please merge the PDFs first.';

      return;
    }

    const link =
      document.createElement('a');

    link.href =
      this.downloadUrl;

    link.download =
      'merged.pdf';

    link.click();
  }


  // =========================
  // CLEANUP
  // =========================

  ngOnDestroy(): void {

    if (this.downloadUrl) {

      URL.revokeObjectURL(
        this.downloadUrl
      );

      this.downloadUrl = null;
    }
  }

}