FROM python:3

RUN	git clone https://github.com/Marzisoft/globalafk.git && \
	cd ./globalafk && \
	pip3 install -r requirements.txt

# use this to test changes to a local copy
#COPY ./docker/notifier/globalafk ./globalafk
#RUN	cd ./globalafk && \
#	pip3 install -r requirements.txt

COPY ./docker/notifier/config.py ./globalafk/config/config.py

WORKDIR ./globalafk

CMD ["python3", "main.py"]
