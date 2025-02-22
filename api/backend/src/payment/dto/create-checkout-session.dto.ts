import { IsNumber, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;
} 