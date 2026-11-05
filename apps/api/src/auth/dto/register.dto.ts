import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Full name is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}

