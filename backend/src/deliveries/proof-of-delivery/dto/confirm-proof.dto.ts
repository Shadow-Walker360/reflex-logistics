import { IsString, Length } from 'class-validator';

export class ConfirmProofOfDeliveryDto {
  @IsString()
  @Length(64, 64) // hex-encoded 32-byte token, see proof-token.ts
  token!: string;
}
