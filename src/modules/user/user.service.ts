import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { UserRole } from './enums/user-role.enum';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { LoggingService } from '../../core/logging';
import type { Payload } from '../../common/interfaces/auth-token.interface';
import { formatUserLog } from '../../common/helpers';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly logger: LoggingService,
  ) {}

  async register(registerDto: RegisterUserDto) {
    const { email, password, role } = registerDto;

    const existingUser = await this.userModel.findOne({ email });

    if (existingUser) {
      this.logger.assign({ messages: ['User already exists'] });
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await this.hashPassword(password);
    const user: User = new this.userModel({
      email,
      password: hashedPassword,
      role: (role as UserRole) || UserRole.USER,
    });

    await user.save();

    this.logger.assign({
      user: formatUserLog(user),
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
      user: formatUserLog(user),
      messages: ['Authentication successful'],
    });

    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async getProfile(userId: string): Promise<User | null> {
    this.logger.assign({ messages: ['Fetching user profile from database'] });

    const userProfile = await this.userModel.findById(userId);

    if (!userProfile) {
      this.logger.assign({ messages: ['User not found'] });
      throw new NotFoundException('User not found');
    }

    this.logger.assign({
      user: formatUserLog(userProfile),
      messages: ['Profile fetched successfully'],
    });

    return userProfile;
  }

  async findAll(): Promise<User[]> {
    this.logger.assign({ messages: ['Fetching all users from database'] });

    const users = await this.userModel.find();

    this.logger.assign({
      messages: [`Users fetched successfully. Count: ${users.length}`],
    });

    return users;
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

  async getAccessToken(payload: Payload): Promise<string> {
    this.logger.assign({
      messages: [`Generating access token`],
    });

    return this.jwtService.signAsync(payload);
  }
}
