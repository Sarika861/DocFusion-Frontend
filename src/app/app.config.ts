import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    // Remove withXhr() and add withFetch()
    provideHttpClient(
      withFetch()
    )
  ]
};