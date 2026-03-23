import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { WideEventLoggerService } from '../../core/logger';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly logger: WideEventLoggerService,
  ) {}

  async register(registerDto: RegisterUserDto) {
    const { email, password } = registerDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      this.logger.assign({ messages: ['User already exists'] });
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await this.hashPassword(password);
    const user: User = new this.userModel({
      email,
      password: hashedPassword,
    });

    await user.save();
    this.logger.assign({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      messages: ['User registered successfully'],
    });
    return { message: 'User registered successfully' };
  }

  async login(loginDto: LoginUserDto) {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email }).select('+password');

    if (!user || !(await this.comparePassword(password, user.password))) {
      this.logger.assign({ messages: ['Authentication failed'] });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.assign({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      messages: ['Authentication successful'],
    });

    const payload = { sub: user._id, email: user.email, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async getProfile(userId: string): Promise<User | null> {
    const user = await this.userModel.findById(userId);
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find();
  }

  async hashPassword(password: string): Promise<string> {
    this.logger.assign({
      messages: [`Hashing password Attempt`],
    });
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    this.logger.assign({
      messages: [`Comparing password Attempt`],
    });
    return bcrypt.compare(password, hash);
  }
}
