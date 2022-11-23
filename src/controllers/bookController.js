const bookModel = require("../models/bookModel")
const mongoose = require("mongoose")
const moment = require("moment")
const userModel = require("../models/userModel")
const reviewModel = require("../models/reviewModel")
const awscontroller = require("../aws/awsController")

const createBook = async function (req, res) {
    try {
        let data = req.body
        let file=req.file
        if(file && file.length>0) var uploadedfileURL= await awscontroller.uploadfile([0])
       

        if (Object.keys(data).length == 0) return res.status(400).send({ status: false, msg: "Please input data!" })

        let { title, excerpt, userId, ISBN, category, subcategory, releasedAt,bookcover } = data
        data.bookcover=uploadedfileURL
        data=JSON.parse(JSON.stringify(data))

        if (!title) return res.status(400).send({ status: false, msg: "Please insert title!" })
        let uniqueTitle = await bookModel.findOne({ title: title })
        if (uniqueTitle) return res.status(409).send({ status: false, msg: "Title already exists!" })
        data.title = data.title.trim().split(" ").filter(word =>word).join(" ")

        if (!excerpt) return res.status(400).send({ status: false, msg: "Excerpt should be present!" })


        if (!userId) return res.status(400).send({ status: false, msg: "UserId should be present!" })
        let chkUserId = await userModel.findOne({_id : userId})
        if(!chkUserId) return res.status(409).send({status : false, msg : "UserId doesn't exist in the Database!"})

        let isValidId = mongoose.Types.ObjectId.isValid(userId)
        if (!isValidId) return res.status(400).send({ status: false, msg: "The userId provided is invalid!" })


        if (!ISBN) return res.status(400).send({ status: false, msg: "Please provide an ISBN!" })
        let isbnRegex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/
        if (!isbnRegex.test(ISBN)) {
            return res.status(400).send({ status: false, msg: "Please provide a valid ISBN!" })

        }
        let uniqueISBN = await bookModel.findOne({ ISBN: ISBN })
        if (uniqueISBN) return res.status(409).send({ status: false, msg: "ISBN already exists!" })


        if (!category) return res.status(400).send({ status: false, msg: "Please provide a category!" })


        if (!subcategory) return res.status(400).send({ status: false, msg: "Please provide a subCategory!" })


        if (!releasedAt) return res.status(400).send({ status: false, msg: "Please provide a release date!" })
        releasedAt = moment(releasedAt).format("YYYY-MM-DD")
        let isValidDateFormat = function (date) {
            let dateFormatRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/

            return dateFormatRegex.test(date)
        }
        if (!isValidDateFormat(releasedAt)) return res.status(400).send({ status: false, msg: "Wrong date format!" })

        let bookCreated = await bookModel.create(data)

        res.status(201).send({ status: true, msg: "Book created successfully!", bookCreated })
    } catch (error) {
        res.status(500).send({ msg: error.message })
    }
}






const getBooks = async function (req, res) {
    try {

        let query = req.query


        if (!query) {
            let allBook = await bookModel.find({ isDeleted: false }).sort("title")
            if (allBook.length == 0) return res.status(404).send({ status: false, message: "Book/s Not Found" })
            return res.status(200).send({ status: true, message: "Books List", data: allBook })
        }

        if (query.userId) {
            let id = query.userId
            let isValidId = mongoose.Types.ObjectId.isValid(id)
            if (!isValidId) return res.status(400).send({ status: false, msg: "The userId provided is invalid!" })
            let user = await userModel.findById({_id : id})
            if (!user) { return res.status(404).send({ status: false, msg: "No book of such user" }) }
        }

        if (query.category) {
            const category = query.category
            const book = await bookModel.find({ category: category })
            if (book.length == 0) { return res.status(404).send({ status: false, msg: "No book related to this category" }) }
        }

        if (query.subcategory) {
            const subcategory = query.subcategory
            const book = await bookModel.find({ subcategory: subcategory })
            if (book.length == 0) { return res.status(404).send({ status: false, msg: "No book related to this subcategory" }) }
        }

        let getAllBook = await bookModel.find(query).select({ _id: 1, title: 1, excerpt: 1, userId: 1, category: 1, releasedAt: 1, reviews: 1 }).sort("title")

        if (getAllBook.length == 0) return res.status(404).send({ status: false, message: "Book Not Found" })

        return res.status(200).send({ status: true, message: "Books List", data: getAllBook })
    } catch (error) {
        res.status(500).send({ msg: error.message })
    }
}




//GETTING BOOKS BY ID

const getBooksById = async function (req, res) {
    try {
        let bookId = req.params.bookId;
       
      let isValidbookID = mongoose.isValidObjectId(bookId);
      if (!isValidbookID) return res.status(400).send({ status: false, message: "BookId is not valid" });
      
  
      const book = await bookModel.findOne({_id: bookId, isDeleted: false,}).select({ __v: 0, ISBN: 0 }).lean() 
      if (!book) return res.status(404).send({ status: false, message: "BookId does not exist!" });
    
    const reviews = await  reviewModel.find({bookId : bookId, isDeleted : false})
         
            book.reviewsData = reviews
     
    
   return res.status(200).send({ status: true, message: "Successfully fetched books!", data: book });

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};





const updateBooks = async function (req, res) {
    try {
        let bookId = req.params.bookId;
        let isValidId = mongoose.Types.ObjectId.isValid(bookId) //changed
        if (!isValidId) return res.status(400).send({ status: false, msg: "The bookId provided is invalid!" })

        let book = await bookModel.findOne({ _id: bookId, isDeleted: false })
        if (!book) {
            return res.status(404).send({ status: false, message: "No books found with this bookId." })
        }

        let data = req.body;
        if (Object.keys(data).length == 0) {   //changed
            return res.status(400).send({ status: false, message: "Please provide with valid request in the body!" })
        }

        const { title, excerpt, releasedAt, ISBN } = data;
        if (title) {
            let titlePresent = await bookModel.find({ title: title, isDeleted: false })
            if (titlePresent.length !== 0) {
                return res.status(400).send({ status: false, message: "This title has already been taken!" })
            }
            book.title = title;
        }
        if (excerpt) book.excerpt = excerpt;
        if (releasedAt) book.releasedAt = releasedAt;
        if (ISBN) {
            let ISBNpresent = await bookModel.find({ ISBN: ISBN, isDeleted: false })
            if (ISBNpresent.length !== 0) {
                return res.status(400).send({ status: false, message: "The ISBN is already taken!" })
            }
            let isbnRegex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/
        if (!isbnRegex.test(ISBN)) {
            return res.status(400).send({ status: false, msg: "Please provide a valid ISBN!" })

        }
            book.ISBN = ISBN;
        }
        book.save();
        res.status(200).send({ status: true, message: "Updated succesfully!", data: book })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}












//DELETE BOOKS
const deleteBooks = async function (req, res) {
    try {
        let data = req.params.bookId
        let isValid = mongoose.Types.ObjectId.isValid(data)
        if (!isValid) return res.status(400).send({ status: false, msg: "Enter valid bookId" })

        let alreadyDeleted = await bookModel.findOne({ _id: data, isDeleted: true })
        if (alreadyDeleted) return res.status(404).send({ status: false, msg: "This book has already been deleted!" })

        let update = await bookModel.findOneAndUpdate({ _id: data }, { $set: { isDeleted: true } }, { new: true })

        if (!update) return res.status(404).send({ status: false, msg: "No book with such bookId exists!" })

        res.status(200).send({ status: true, msg: "Deletion successful!", update })


    } catch (error) {
        res.status(500).send({ msg: error.message })
    }
    
}

module.exports.createBook = createBook
module.exports.getBooks = getBooks
module.exports.getBooksById = getBooksById
module.exports.updateBooks = updateBooks
module.exports.deleteBooks = deleteBooks