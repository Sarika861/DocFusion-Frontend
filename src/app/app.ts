import { Component } from '@angular/core';
import { DocumentMerger } from './document-merger/document-merger';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DocumentMerger],
  templateUrl: './app.html'
})
export class App {
  title = 'frontend';
}