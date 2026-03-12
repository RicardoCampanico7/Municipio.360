import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsString()
  biNumber: string;

  @IsString() 
  postalCode: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}