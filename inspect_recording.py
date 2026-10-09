import cv2, os
v=r"C:\Users\Kaustuv Gupta\Videos\Recording 2026-10-08 033804.mp4"
c=cv2.VideoCapture(v); fps=c.get(cv2.CAP_PROP_FPS)
os.makedirs(r"C:\Users\Kaustuv Gupta\Desktop\portfolio\.tmp_recording",exist_ok=True)
for t in [0.5,1.0,1.5,2.5,3.5,4.5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,12.5,13.5,14.5,15.5,16.5,17.5,18.5,19.5]:
 c.set(cv2.CAP_PROP_POS_FRAMES,int(fps*t)); ok,im=c.read()
 if ok: cv2.imwrite(rf"C:\Users\Kaustuv Gupta\Desktop\portfolio\.tmp_recording\frame_{t:04.1f}.jpg",im)
