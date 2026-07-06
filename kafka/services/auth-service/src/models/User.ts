import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";


export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 6, select: false }
    },
    { timestamps: true }
);

// Hash password 
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword: string) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set("toJSON", {
    transform: (_doc, ret) => {
        const { password, ...rest } = ret;
        return rest;
    },
});

const User = mongoose.model<IUser>("User", userSchema);
export default User;