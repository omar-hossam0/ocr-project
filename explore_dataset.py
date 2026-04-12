"""
استكشاف الداتاسيت — يعرض الصور والنصوص المقابلة لها
"""
import pandas as pd
from PIL import Image
import io
import os
import tkinter as tk
from tkinter import ttk
from PIL import ImageTk

# ── تحميل الداتاسيت ───────────────────────────────────────────
PARQUET = "train-00000-of-00208-3f1d0dff7cee414a.parquet"

if not os.path.exists(PARQUET):
    print(f"[ERROR] الملف مش موجود: {PARQUET}")
    exit(1)

print("جاري تحميل الداتاسيت...")
df = pd.read_parquet(PARQUET)

# ── معلومات عامة ─────────────────────────────────────────────
print("\n" + "="*50)
print("معلومات الداتاسيت:")
print("="*50)
print(f"عدد الصفوف (صور):  {len(df)}")
print(f"الأعمدة:           {list(df.columns)}")
print(f"\nأول 5 صفوف:\n{df.head()}")

# إظهار معلومات النص لو موجود
text_cols = [c for c in df.columns if 'text' in c.lower() or 'label' in c.lower() or 'word' in c.lower()]
if text_cols:
    print(f"\nأعمدة النصوص الموجودة: {text_cols}")
    for col in text_cols:
        print(f"\nعينة من '{col}':")
        print(df[col].head(20).tolist())

# ── إحصائيات ─────────────────────────────────────────────────
print("\n" + "="*50)
print("إحصائيات:")
print("="*50)

# حجم الصور
sample_img = Image.open(io.BytesIO(df.iloc[0]["image"]["bytes"]))
print(f"حجم الصورة الأولى: {sample_img.size}  (W×H)")
print(f"Mode:              {sample_img.mode}")

# إحصائيات النصوص لو موجودة
for col in text_cols:
    if df[col].dtype == object:
        lengths = df[col].dropna().str.len()
        print(f"\nطول '{col}':")
        print(f"  أقل طول:   {lengths.min()}")
        print(f"  أكبر طول:  {lengths.max()}")
        print(f"  متوسط:     {lengths.mean():.1f}")

# ── Viewer رسومي ──────────────────────────────────────────────
print("\nجاري فتح الـ Viewer...")

class DatasetViewer:
    def __init__(self, df):
        self.df = df
        self.idx = 0
        self.text_col = text_cols[0] if text_cols else None

        self.root = tk.Tk()
        self.root.title("Dataset Viewer")
        self.root.geometry("700x520")
        self.root.resizable(True, True)

        # ── Image display ─────────────────────────────────────
        self.img_label = tk.Label(self.root, bg="black")
        self.img_label.pack(pady=10, expand=True)

        # ── Info ──────────────────────────────────────────────
        info_frame = tk.Frame(self.root)
        info_frame.pack(fill="x", padx=15)

        tk.Label(info_frame, text="Index:", font=("Helvetica", 11, "bold")).grid(row=0, column=0, sticky="w")
        self.idx_label = tk.Label(info_frame, text="", font=("Helvetica", 11))
        self.idx_label.grid(row=0, column=1, sticky="w", padx=5)

        if self.text_col:
            tk.Label(info_frame, text="النص:", font=("Helvetica", 11, "bold")).grid(row=1, column=0, sticky="w")
            self.text_label = tk.Label(info_frame, text="", font=("Helvetica", 13), fg="#2980b9")
            self.text_label.grid(row=1, column=1, sticky="w", padx=5)

        tk.Label(info_frame, text="حجم الصورة:", font=("Helvetica", 11, "bold")).grid(row=2, column=0, sticky="w")
        self.size_label = tk.Label(info_frame, text="", font=("Helvetica", 11))
        self.size_label.grid(row=2, column=1, sticky="w", padx=5)

        # ── أعمدة إضافية ──────────────────────────────────────
        extra_cols = [c for c in df.columns if c != "image" and c not in (text_cols or [])]
        if extra_cols:
            tk.Label(info_frame, text="بيانات أخرى:", font=("Helvetica", 11, "bold")).grid(row=3, column=0, sticky="nw")
            self.extra_label = tk.Label(info_frame, text="", font=("Helvetica", 10), justify="left", wraplength=500)
            self.extra_label.grid(row=3, column=1, sticky="w", padx=5)
        else:
            self.extra_label = None
        self.extra_cols = extra_cols

        # ── Navigation ────────────────────────────────────────
        nav_frame = tk.Frame(self.root)
        nav_frame.pack(pady=10)

        tk.Button(nav_frame, text="◀◀ First",  width=8,  command=self.first).grid(row=0, column=0, padx=4)
        tk.Button(nav_frame, text="◀ Prev",    width=8,  command=self.prev).grid(row=0,  column=1, padx=4)
        tk.Button(nav_frame, text="Next ▶",    width=8,  command=self.next).grid(row=0,  column=2, padx=4)
        tk.Button(nav_frame, text="Last ▶▶",   width=8,  command=self.last).grid(row=0,  column=3, padx=4)
        tk.Button(nav_frame, text="Random 🎲",  width=10, command=self.random,
                  bg="#27ae60", fg="white").grid(row=0, column=4, padx=4)

        # Jump to index
        jump_frame = tk.Frame(self.root)
        jump_frame.pack()
        tk.Label(jump_frame, text="اذهب لرقم:").grid(row=0, column=0)
        self.jump_entry = tk.Entry(jump_frame, width=8)
        self.jump_entry.grid(row=0, column=1, padx=4)
        tk.Button(jump_frame, text="Go", command=self.jump).grid(row=0, column=2)

        self.show()
        self.root.mainloop()

    def show(self):
        row = self.df.iloc[self.idx]

        # صورة
        img = Image.open(io.BytesIO(row["image"]["bytes"])).convert("RGB")
        orig_w, orig_h = img.size

        # resize للعرض (max 600×250)
        scale = min(600/orig_w, 250/orig_h, 1.0)
        disp_w, disp_h = max(1, int(orig_w*scale)), max(1, int(orig_h*scale))
        img_disp = img.resize((disp_w, disp_h), Image.LANCZOS)

        self.tk_img = ImageTk.PhotoImage(img_disp)
        self.img_label.config(image=self.tk_img)

        # معلومات
        self.idx_label.config(text=f"{self.idx} / {len(self.df)-1}")
        self.size_label.config(text=f"{orig_w} × {orig_h}")

        if self.text_col:
            self.text_label.config(text=str(row.get(self.text_col, "—")))

        if self.extra_label:
            extra_text = "\n".join(f"{c}: {row[c]}" for c in self.extra_cols[:5])
            self.extra_label.config(text=extra_text)

    def next(self):
        self.idx = min(self.idx + 1, len(self.df) - 1); self.show()

    def prev(self):
        self.idx = max(self.idx - 1, 0); self.show()

    def first(self):
        self.idx = 0; self.show()

    def last(self):
        self.idx = len(self.df) - 1; self.show()

    def random(self):
        import random
        self.idx = random.randint(0, len(self.df) - 1); self.show()

    def jump(self):
        try:
            n = int(self.jump_entry.get())
            self.idx = max(0, min(n, len(self.df) - 1))
            self.show()
        except ValueError:
            pass

DatasetViewer(df)
