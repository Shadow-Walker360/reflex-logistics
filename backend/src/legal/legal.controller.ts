import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';

interface TermsInfo {
  version: string;
  url: string;
}

/**
 * Spec deviation (ADR-012): supports the signup page's "I agree to the
 * Terms and Conditions" link/checkbox. Deliberately minimal - this is NOT
 * a legal content management system. The backend does not host, render,
 * or version-diff the actual terms text; it exposes only the current
 * version identifier and a URL the frontend links to. Hosting the
 * document itself (a static page, a CMS entry, whatever the eventual
 * legal/marketing site uses) is out of scope for this endpoint.
 */
@ApiTags('legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get('terms')
  getCurrentTerms(): TermsInfo {
    return {
      version: this.config.get<string>('legal.currentTermsVersion') as string,
      url: this.config.get<string>('legal.termsUrl') as string,
    };
  }
}
