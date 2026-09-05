import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(32)
  phoneNumber!: string;

  @IsString()
  @MaxLength(500)
  address!: string;
}
