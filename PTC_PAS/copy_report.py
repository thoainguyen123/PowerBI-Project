import shutil, os

pas_dir = r'C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS'
src = os.path.join(pas_dir, 'index.html')
dst1 = os.path.join(pas_dir, 'Bao_Cao_TQT.html')

shutil.copyfile(src, dst1)
print("Copied to Bao_Cao_TQT.html successfully.")
